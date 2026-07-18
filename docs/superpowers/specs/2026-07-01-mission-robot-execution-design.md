# Design — Exécution de mission par robot (N:N)

**Date :** 2026-07-01

## Contexte

Une mission peut être assignée à plusieurs robots (`mission_robot_dog` en N:N), mais `Mission` porte aujourd'hui un statut unique (`_status`) et une progression de steps partagée (`MissionStep.status`). Rien ne câble `Mission.startMission()` : la commande `start_mission` ne fait passer que le `RobotDog` en `IN_MISSION`, sans toucher la mission.

Câbler naïvement `mission.startMission()` casse dès qu'un deuxième robot démarre la même mission (`InvalidMissionAlreadyRunningError`), et la progression des steps est globale alors qu'elle doit être suivie par robot. Ce document définit un modèle qui sépare la définition de la mission (partagée, éditable hors exécution) de son exécution par robot (indépendante, historisée).

Pas de données de production à migrer : `Mission.status` et le statut sur `MissionStep` sont supprimés directement, sans migration de compatibilité.

## Modèle de domaine

**`Mission` (simplifié)**
- Garde `id`, `name`, `userId`, `missionSteps` (définition seule : `actionId`, `order`, `parameters`).
- **Supprime** `status` (mission) et `status` (sur `MissionStep`) — plus aucun statut au niveau de la mission.
- `mission_robot_dog` (pivot N:N, inchangée) reste la relation de planification : quels robots sont candidats pour cette mission. N'a aucun lien avec l'exécution.

**`MissionRun` (nouvelle entité racine, aggregate séparé)**
- Une ligne par exécution réelle d'une mission par un robot.
- Champs : `id`, `missionId`, `robotDogId`, `status` (`RUNNING | SUCCESS | FAILED | INTERRUPTED` — pas de `STAND_BY`, un run n'existe qu'à partir de son démarrage), `startedAt`, `endedAt`.
- Table `mission_runs`.
- Historisé : un même (mission, robot) peut avoir plusieurs `MissionRun` dans le temps (ré-exécutions). Rien n'est écrasé/réinitialisé.

**`MissionRunStep` (entité enfant de `MissionRun`)**
- Une ligne par step de la mission, par run.
- Référence `MissionStepId` (pas de copie de `actionId`/`parameters` : comme l'édition des steps est bloquée tant qu'un run est actif, la référence reste stable pendant toute la durée du run).
- Champ : `status` (`PENDING | COMPLETED | FAILED`).
- Table `mission_run_steps`, créée automatiquement (une ligne par step) au démarrage du run.

## Flux d'exécution

**Assigner** — `POST /api/v1/dogs/:id/assign` (inchangé) : attache la pivot `mission_robot_dog`. Purement déclaratif, ne crée aucun run.

**Démarrer** — `POST /api/v1/dogs/:id/commands` (`type=start_mission`, `missionId` requis), dans `SendRobotCommandUseCase` :
1. Vérifie que le robot est assigné à la mission (pivot existe) → sinon `MissionNotAssignedToRobotError`.
2. Charge `Mission` pour lister les steps actuels.
3. Crée un `MissionRun` (`RUNNING`, `startedAt=now`) + un `MissionRunStep` (`PENDING`) par step.
4. `dog.startMission()` (inchangé — refuse si le robot n'est pas `IDLE`, ce qui garantit un seul run actif par robot à la fois).
5. Envoie la commande MQTT, sauvegarde `run` + `dog`.

**Progression** — webhook robot → `HandleRobotMissionUpdateUseCase(dogId, update)` :
1. Utilise `dogId` (aujourd'hui reçu mais ignoré, préfixé `_dogId`) pour retrouver le `MissionRun` actif de ce robot sur cette mission (`findActiveRun(missionId, dogId)`).
2. Met à jour le `MissionRunStep` correspondant (`COMPLETED`/`FAILED`).
3. Si tous les `MissionRunStep` du run sont `COMPLETED` → `run.complete()` (`SUCCESS`, `endedAt=now`). Si un step a `FAILED` → `run.fail()` (`FAILED`, `endedAt=now`).
4. Si le run devient terminal, appelle aussi `dog.endMission()` (aujourd'hui déclenché uniquement par `stop_mission` explicite — il faut l'ajouter ici pour la fin naturelle).
5. Sauvegarde `run` + `dog`, dispatch des events scopés (`runId`, `missionId`, `robotDogId`).

**Arrêter en cours de route** — `POST /api/v1/dogs/:id/commands` (`type=stop_mission`) :
- Retrouve le run actif du robot (pas besoin de `missionId` : un robot n'a qu'un run actif à la fois).
- `run.interrupt()` (`INTERRUPTED`, `endedAt=now`), `dog.endMission()`.

## Règles d'édition et de retrait

**Édition des steps** (add/remove/move/sync) — la règle passe de *"mission en `STAND_BY`"* à *"aucun `MissionRun` actif (statut `RUNNING`) sur cette mission, tous robots confondus"*. `Mission` ne pouvant pas interroger `MissionRun` (aggregates séparés), le contrôle se fait au niveau use-case, qui interroge `MissionRunRepository.hasActiveRun(missionId)` et passe le résultat à l'entité :

```
hasActiveRun = missionRunRepository.hasActiveRun(missionId)
mission.addStep(actionId, parameters, hasActiveRun) // lève InvalidMissionNotEditableError si true
```

Même mécanique pour `removeStep`, `moveStep`, `syncSteps`.

**Retrait d'un robot** (`DELETE /api/v1/dogs/:id/missions/:missionId`) — bloqué si ce robot a un `MissionRun` **actif** sur cette mission (réutilise `InvalidMissionAlreadyRunningError`). Il faut d'abord `stop_mission`. Le retrait de la pivot ne supprime jamais l'historique des runs passés.

**Suppression de la mission** — la cascade existante sur les steps est étendue à `mission_runs` et `mission_run_steps`.

## Erreurs de domaine

- `MissionNotAssignedToRobotError` — démarrage demandé pour un robot non assigné à la mission.
- `NoActiveMissionRunError` — `stop_mission` alors qu'aucun run n'est actif pour ce robot.
- Réutilisées : `InvalidMissionNotEditableError` (édition bloquée), `InvalidMissionAlreadyRunningError` (retrait bloqué / double démarrage sur le même robot).

## Tests à couvrir

- `MissionRun` : transitions `complete()` / `fail()` / `interrupt()` (unit, même style que `Mission` aujourd'hui).
- `SendRobotCommandUseCase` : le démarrage crée le run + les `MissionRunStep` ; refuse si le robot n'est pas assigné à la mission ou a déjà un run actif.
- `HandleRobotMissionUpdateUseCase` : retrouve le bon run via `dogId`, complète/échoue correctement, libère le robot (`dog.endMission()`) en fin de run.
- Deux robots sur la même mission : chacun a son propre `MissionRun` et sa propre progression ; l'un peut terminer pendant que l'autre tourne encore, sans effet croisé.
- Édition bloquée dès qu'un run est actif sur n'importe lequel des robots assignés à la mission ; de nouveau permise une fois tous les runs terminaux.

## Ce qui n'est pas dans ce scope

- Pas de nouvel endpoint de consultation de l'historique des runs (le stockage existe, la consultation viendra dans une itération future selon le besoin UI).
- `MissionTransformer` perd simplement le champ `status`, sans champ de remplacement pour l'instant.
- Pas de migration de données existantes (confirmé : aucune donnée de production sur `Mission.status`).
