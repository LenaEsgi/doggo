# Design — Scheduler de missions récurrentes

**Date :** 2026-07-13

## Contexte

L'utilisateur doit pouvoir planifier le déclenchement automatique d'une mission selon une règle récurrente hebdomadaire : "tous les jeudis à 12h45", "tous les jours de la semaine à 12h24", "mardi et jeudi à 16h30", etc.

Une table `mission_schedules` existe déjà (migration `1771244533584_create_mission_schedules_table.ts`) mais elle ne modélise qu'une date planifiée unique et non récurrente (`mission_id` **unique** + `planned_at` timestamp), et n'est utilisée nulle part dans le code. Elle ne peut pas représenter une récurrence et est remplacée par le modèle ci-dessous.

Ce document couvre uniquement le backend : modèle de données, déclenchement automatique au bon moment. La création des horaires par l'utilisateur (API) et le frontend sont hors scope de cette itération (voir "Ce qui n'est pas dans ce scope").

### Décisions de cadrage

- Une mission peut avoir **plusieurs schedules indépendants** (pas de contrainte d'unicité par mission).
- Chaque schedule cible **un robot précis**, choisi à la création (pas de résolution dynamique parmi les robots assignés).
- Récurrence **hebdomadaire uniquement** : un ensemble de jours de la semaine + une heure:minute. Pas de cron libre, pas de mensuel, pas de plusieurs heures par jour.
- **Un seul fuseau horaire** pour toute l'app (config globale), pas de fuseau par schedule.
- Cycle de vie simple : `enabled`/`disabled` (toggle), pas de date de fin.
- Si le robot cible est déjà occupé (`InvalidMissionAlreadyRunningError`) à l'heure prévue : l'occurrence est **ignorée** (loggée, événement domaine émis), pas de retry automatique.

### Choix d'architecture : polling périodique plutôt qu'un scheduler BullMQ par règle

Deux mécanismes de déclenchement ont été comparés :

- **Un job récurrent BullMQ par schedule** (`upsertJobScheduler` par ligne) : nécessite de traduire `daysOfWeek + heure` en expression cron et de maintenir cette traduction synchronisée avec la DB (double source de vérité : colonnes structurées + scheduler vivant dans Redis), avec un risque de dérive nécessitant une réconciliation explicite au boot.
- **Un unique job "tick" toutes les minutes qui interroge la DB** (retenu) : la DB reste l'unique source de vérité ; créer/modifier/désactiver un schedule est un simple write SQL, sans rien à synchroniser côté queue. C'est le pattern dominant dans les schedulers de référence à grande échelle (contrôleur `CronJob` de Kubernetes, `Quartz Scheduler`, `Sidekiq-cron`, `cron(8)` lui-même) : tous pollent une définition persistée plutôt que de maintenir un timer vivant par règle.

Le mécanisme retenu sépare détection et exécution en deux queues BullMQ (voir "Infrastructure").

## Modèle de données

PostgreSQL (driver `pg` déjà utilisé) : `days_of_week` est un tableau natif `smallint[]`, pas besoin de table pivot ni de JSON.

**Table `mission_schedules`** (remplace la migration existante inutilisée)

```
id              uuid primary key
mission_id      uuid  → missions.id (CASCADE)      -- pas unique
robot_dog_id    uuid  → robot_dogs.id (CASCADE)
days_of_week    smallint[]   -- 1=lundi ... 7=dimanche, ex: {2,4}
hour            smallint     -- 0-23
minute          smallint     -- 0-59
enabled         boolean      default true
created_at / updated_at
```

**Table `mission_schedule_firings`** (nouvelle — idempotence + audit)

```
id                    uuid primary key
mission_schedule_id   uuid  → mission_schedules.id (CASCADE)
fired_for_minute      timestamp  -- horodatage UTC de l'occurrence prévue, tronqué à la minute
mission_run_id        uuid nullable  → mission_runs.id (null si échec avant création du run)
outcome               varchar  -- 'DISPATCHED' | 'ROBOT_BUSY' | 'ERROR'
created_at

UNIQUE (mission_schedule_id, fired_for_minute)
```

La contrainte unique sert de verrou anti-double-déclenchement (via `INSERT ... ON CONFLICT DO NOTHING`) et double comme journal d'audit ("dernière exécution", historique du planning) pour un futur écran frontend.

## Modèle de domaine et application

Nouveau module `mission-schedules`, structure hexagonale identique au module `missions` existant.

**Domaine**
- `MissionSchedule` (entité) : `id, missionId, robotDogId, daysOfWeek, hour, minute, enabled`.
  - `isDueAt(now: DateTime): boolean` — méthode pure comparant jour/heure/minute de `now` (converti dans le fuseau configuré) aux champs stockés. Aucune dépendance infra, testable en isolation.
  - `enable()` / `disable()`.
  - Validation à la création : `daysOfWeek` non vide, `hour` 0-23, `minute` 0-59 (erreurs dédiées, même famille que les erreurs existantes de `Mission`).
- Contract `MissionScheduleRepository` : `save`, `findById`, `findEnabled()`, `findByMission`, `delete`.
- Contract `MissionScheduleFiringRepository` : `tryClaim(scheduleId, firedForMinute): boolean` (encapsule l'insert avec `ON CONFLICT`), `recordOutcome(...)`.

**Application (use cases)**
- `CreateMissionScheduleUseCase` — vérifie que la mission est assignée au robot cible (réutilise le contrôle existant, type `MissionNotAssignedToRobotError`), puis persiste.
- `UpdateMissionScheduleUseCase`, `ToggleMissionScheduleUseCase`, `DestroyMissionScheduleUseCase`.
- `ListMissionSchedulesUseCase` (par mission).
- `DispatchDueMissionSchedulesUseCase` — appelé à chaque tick : charge les schedules `enabled`, filtre ceux où `isDueAt(now)` est vrai, tente `tryClaim` pour chacun, et pousse un job de dispatch pour ceux dont le claim réussit.

## Infrastructure (déclenchement)

Deux queues BullMQ, séparant détection et exécution — même famille de pattern que la queue `mission-timeouts` existante (`MissionTimeoutQueue` / `BullMqMissionTimeoutQueue` / `Worker`).

1. **`mission-schedule-ticks`** — un unique job récurrent enregistré de façon idempotente au boot (`queue.upsertJobScheduler('mission-schedule-tick', { pattern: '* * * * *' })`, dans un nouveau provider suivant le pattern de `QueueProvider`). Un `Worker` (concurrence 1) appelle `DispatchDueMissionSchedulesUseCase.execute(now)` à chaque tick.
2. **`mission-schedule-dispatch`** — alimentée par le use case ci-dessus avec `{ scheduleId, missionId, dogId, firedForMinute }`. Un `Worker` séparé (concurrence 5) consomme et appelle `StartMissionCommandUseCase`.

Le job scheduler BullMQ (tick) persiste dans Redis ; le réenregistrement au boot est un no-op idempotent, résilient aux redémarrages.

## Gestion des erreurs

- **Robot occupé** (`InvalidMissionAlreadyRunningError`) — capturé dans le worker de dispatch, `outcome=ROBOT_BUSY` enregistré, pas de retry BullMQ (erreur attendue, non transitoire). Un événement domaine (`MissionScheduleSkippedEvent`, même famille que `MissionCompletedEvent`) est émis pour un futur listener de notification.
- **Mission désassignée du robot entre-temps** (`MissionNotAssignedToRobotError`) — `outcome=ERROR`, et le schedule est automatiquement désactivé (`enabled=false`) pour éviter un échec silencieux répété.
- **Double tick / plusieurs instances de l'app** — couvert par la contrainte unique DB sur `(mission_schedule_id, fired_for_minute)`, indépendamment du nombre d'instances ou de workers.
- **DST** — cas limite accepté sans traitement spécial (une occurrence à l'heure du changement peut ne pas se déclencher ou se déclencher deux fois) ; jugé non pertinent vu la précision attendue.

## Tests à couvrir

- Domaine : `MissionSchedule.isDueAt()` exhaustif (jour ne correspond pas, limites heure/minute), sans infra.
- Application : `DispatchDueMissionSchedulesUseCase` avec repositories fakes en mémoire (même pattern que `fake-mission-timeout-queue.ts`), y compris le cas où `tryClaim` échoue (déjà déclenché) et le cas robot occupé.
- HTTP : tests controllers/validators pour le CRUD des schedules, alignés sur les tests existants du module `missions`.

## Ce qui n'est pas dans ce scope

- API HTTP de création/gestion des schedules par l'utilisateur (CRUD complet, validators, controllers) — prévu dans une itération suivante de cette même fonctionnalité, une fois ce design validé.
- Frontend (écran de planification, affichage de l'historique des déclenchements) — itération future.
- Cron libre / récurrence mensuelle / plusieurs heures par jour — non retenu, le modèle hebdomadaire structuré couvre les besoins exprimés.
- Fuseau horaire par schedule ou par utilisateur — un seul fuseau global pour l'app.
- Notification utilisateur en cas de `ROBOT_BUSY` — l'événement domaine est prévu mais le canal de notification (SSE existant, email, etc.) sera branché avec le reste des notifications de mission.
