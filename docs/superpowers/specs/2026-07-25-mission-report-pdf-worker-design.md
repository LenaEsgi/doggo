# Génération de rapport PDF de mission via Worker isolé — Design

## Contexte

Le projet doit intégrer au moins un service de type Worker isolé du Backend, communiquant avec lui via deux queues (une pour les demandes, une pour les réponses), sans jamais d'appel synchrone Worker→Backend, et sans que le Worker ait accès à la base de données ni aux modèles du Backend. Le Worker doit inclure au moins une tâche métier spécifique au domaine — ici, la génération d'un PDF de rapport de mission à la fin de chaque `MissionRun`.

Le Backend actuel (AdonisJS, clean architecture/DDD) utilise déjà BullMQ/Redis, mais uniquement pour de la planification interne au même process (mission-timeout, mission-schedule, robot-liveness-tick). BullMQ n'a pas de client Rust mature ; réutiliser Redis/BullMQ pour le pont Backend↔Worker forcerait à réimplémenter son protocole interne côté Rust. On introduit donc RabbitMQ comme broker dédié à ce pont, sans toucher au BullMQ/Redis existant.

## Architecture générale & flux de données

- Nouveau conteneur RabbitMQ (AMQP) ajouté à `docker-compose.yml`, à côté de Postgres/Redis/Mosquitto.
- Deux queues durables :
  - `mission-report.requests` (Backend → Worker)
  - `mission-report.responses` (Worker → Backend)
- Nouveau service **Rust**, dans un dossier `worker/` à la racine du repo, projet Cargo indépendant (son propre `Cargo.toml`, `Dockerfile`). Aucune dépendance à AdonisJS, aucun accès DB, aucune connaissance des modèles Lucid. Toutes les données nécessaires au rendu du PDF lui sont fournies dans le message de requête.
- Déclencheur : `MissionCompletedEvent` (déjà dispatché pour les statuts terminaux SUCCESS, FAILED, INTERRUPTED, LAUNCH_FAILED) gagne un nouveau listener `MissionReportRequestListener` qui :
  1. construit un payload autoportant : `missionRunId`, nom de la mission, nom du robot, statut, `startedAt`/`endedAt`, liste ordonnée des steps avec statut ;
  2. publie ce payload sur `mission-report.requests` ;
  3. crée une ligne `mission_reports` en base avec le statut `PENDING`.
- Le Worker Rust consomme `mission-report.requests`, génère le PDF (crate `printpdf` ou `genpdf` — rendu programmatique, pas de moteur de rendu HTML/Chromium embarqué), uploade le résultat dans un bucket GCS (`mission-reports/{missionRunId}.pdf`) via un service-account dédié à ce seul bucket (aucun accès DB, en lecture ou écriture), puis publie **exactement un** message sur `mission-report.responses` :
  - succès : `{ status: "SUCCESS", missionRunId, gcsObjectPath }`
  - échec définitif : `{ status: "FAILED", missionRunId, reason }`
- Le Backend consomme `mission-report.responses` via un petit consommateur AMQP embarqué dans un provider AdonisJS (`MissionReportResponseConsumer`) qui :
  - met à jour `mission_reports.status` (`READY` + `gcs_object_path`, ou `FAILED` + `failure_reason`) ;
  - déclenche une notification via le `NotificationService` existant (réutilise le pipeline SSE déjà en place pour `MissionCompletedEvent`), type `mission.report.ready` ou `mission.report.failed`.
- Téléchargement : `GET /mission-runs/:id/report` — vérifie que le report est `READY`, génère une URL signée GCS de courte durée, renvoie `{ url }`. Le Backend ne proxy jamais les octets du PDF.

## Politique de retry

Tâche non-critique : le résultat de la mission est déjà acté indépendamment de la génération du PDF, qui reste un artefact secondaire. La politique est donc bornée, pas de boucle infinie.

- **Côté Worker** (responsabilité du Worker) : sur échec de rendu ou d'upload GCS, retry interne avec backoff exponentiel (3 tentatives : immédiat, +5s, +30s) avant de considérer l'échec définitif. Sur échec final, le Worker acquitte quand même le message de requête (pour ne pas boucler côté broker) et publie une réponse `FAILED` — contrat "toujours répondre, même en échec".
- **Niveau RabbitMQ** (filet de sécurité, pas le mécanisme principal) : `mission-report.requests` en quorum queue avec `x-delivery-limit` + dead-letter-exchange, pour couvrir le cas où le process Worker crashe en plein traitement (message jamais acquitté). Après épuisement, le message part en DLQ pour inspection manuelle.
- **Côté Backend** : pas de retry sur la publication initiale (l'événement de complétion de mission est un fait ponctuel). Si la publication échoue (broker down), on log en soft-fail — même pattern que le `try/catch` déjà en place dans `mission-completed-sse.listener.ts`. Un rapport raté ne doit jamais faire échouer le traitement métier de la mission elle-même.

## Persistance côté Backend & organisation du code

- Migration : nouvelle table `mission_reports` :
  - `id`
  - `mission_run_id` (FK unique vers `mission_runs`)
  - `status` (`PENDING` / `READY` / `FAILED`)
  - `gcs_object_path` (nullable)
  - `failure_reason` (nullable)
  - `requested_at`
  - `completed_at`
- Rattaché comme sous-concept infra du module `missions` existant (entité + repository + migration à côté de `mission-run`), plutôt qu'un module à part entière — c'est une table compagnon 1:1 de `MissionRun`, pas un domaine indépendant.
- Nouveau endpoint `GET /mission-runs/:id/report` dans `missions/infrastructure/http` — 403/404 si pas encore prêt, `{ url }` signée GCS si `READY`.
- Le Worker Rust vit dans son propre dossier `worker/` à la racine du repo, avec son propre `Cargo.toml` et son propre `Dockerfile`/déploiement — totalement indépendant du build backend.

## Déclencheurs retenus

Tous les statuts terminaux de `MissionRun` déclenchent la génération du rapport : `SUCCESS`, `FAILED`, `INTERRUPTED`, `LAUNCH_FAILED`. Même un échec de lancement mérite une trace documentée pour l'utilisateur/l'audit.

## Tests

- **Backend** :
  - test unitaire du listener `MissionReportRequestListener` (payload publié correct) ;
  - test du consommateur de réponses (met à jour `mission_reports` + déclenche la notification) avec un canal AMQP mocké/de test ;
  - test fonctionnel de l'endpoint de téléchargement (rejet si pas `READY`, URL signée sinon).
- **Worker Rust** :
  - tests unitaires du rendu PDF (structure/contenu attendu) ;
  - tests unitaires de la logique de retry/backoff ;
  - test d'intégration bout-en-bout (RabbitMQ local via docker) — bonus, non bloquant vu le périmètre.

## Hors périmètre

- Pas de tâche d'upload/analyse de fichier utilisateur dans ce Worker pour l'instant — uniquement la génération de PDF de rapport de mission, qui répond déjà à l'exigence "au moins une tâche spécifique au domaine".
- Pas de UI frontend détaillée dans ce design — seule l'API Backend (endpoint + notification) est spécifiée ; l'intégration frontend (bouton de téléchargement) est une suite naturelle mais séparée.
