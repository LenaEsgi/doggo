# Contrat backend attendu par le frontend « Robot Mission Run Control »

> Rédigé le 2026-07-07. Le frontend (`feat/robot-mission-run-control`) est implémenté et
> consomme ce contrat, **mais aucune de ces routes n'existe côté backend** dans le checkout
> actuel (branche `fix/missions-p0`). Ce document décrit précisément ce que le backend doit
> exposer pour que la fonctionnalité marche de bout en bout.

## Contexte

Depuis la page détail robot (vue owner), le frontend permet de : lancer une mission assignée,
l'arrêter, et voir en temps réel la mission en cours + sa progression par step.

Côté front (déjà fait) :
- Repo `RobotDogHttpRepository` : méthodes `startMission` / `stopMission` / `getActiveMissionRun`.
- Composable `useRobotMission` : snapshot initial via HTTP + live via Transmit.
- UI : `ActiveMissionPanel` + bouton « Démarrer » sur `ListMission`.

## État actuel du backend (ce qui MANQUE)

- ❌ Routes `POST` / `DELETE` / `GET /api/v1/dogs/:id/mission`
- ❌ Table `mission_runs` + `mission_run_steps` (aucune migration)
- ❌ Modèle Lucid + entité domaine `MissionRun` / `MissionRunStep`
- ❌ Repository (`findActiveRunByRobotDog`, save…)
- ❌ Use cases `StartMission` / `StopMission` / `GetActiveMissionRun` + controllers + transformers + policy ownership
- ❌ Émission des events Transmit `dogs/{dogId}` et `missions/{missionId}`
- ❌ Le module `robot-communication` (référencé par les plans backend) n'existe pas

> Les 3 plans backend existants (`2026-07-02-restful-mission-command-routes`,
> `2026-07-02-get-active-mission-run-endpoint`,
> `2026-07-02-mission-multi-robot-and-command-handlers`) supposent ce module `robot-communication`
> + entités `MissionRun` déjà présents : **ils ne sont pas exécutables tels quels** et doivent
> être réécrits/adaptés à l'état réel du repo avant usage.

## Routes HTTP à exposer (préfixe `/api/v1`, auth `firebaseAuth`, ownership du robot)

### 1. Démarrer une mission
```
POST /api/v1/dogs/:id/mission
Body: { "missionId": "<uuid>" }
→ 201  { "data": <MissionRun> }
```
Effet attendu : crée un `MissionRun` (status `RUNNING`) pour le robot `:id` et la mission
`missionId`, avec un `runStep` par step de la mission (status initial `PENDING`) ; passe le robot
à l'état `IN_MISSION`. (Idéalement : refuse si le robot a déjà un run actif.)

### 2. Arrêter la mission
```
DELETE /api/v1/dogs/:id/mission
→ 200  { "data": <RobotDog> }
```
Effet attendu : termine le run actif (status `INTERRUPTED`), sort le robot de `IN_MISSION`.

### 3. Récupérer le run actif (snapshot au chargement)
```
GET /api/v1/dogs/:id/mission
→ 200  { "data": <MissionRun> }   si un run est actif
→ 200  null                        si aucun run actif
```
⚠️ Le frontend attend littéralement un corps `null` (pas `{ "data": null }`) quand il n'y a pas
de run — voir `RobotDogHttpRepository.getActiveMissionRun` : `if (!data) return null`.

## Forme des payloads

### `<MissionRun>`
```jsonc
{
  "id": "<uuid>",
  "missionId": "<uuid>",
  "robotDogId": "<uuid>",
  "status": "RUNNING",            // MissionRunStatus
  "startedAt": "<ISO8601>",
  "endedAt": null,                // ISO8601 | null
  "runSteps": [
    { "id": "<uuid>", "stepId": "<uuid>", "status": "PENDING" }  // MissionStepStatus
  ]
}
```
> Le frontend ne mappe que `id`, `missionId`, `robotDogId`, `status`, et
> `runSteps[].{stepId,status}`. `startedAt`/`endedAt`/`runSteps[].id` sont tolérés mais non lus.

### `<RobotDog>`
Même forme que celle déjà renvoyée par `GET /api/v1/dogs/:id` :
`{ id, name, state, batteryLevel, lastHeartbeat }`.

## Enums (miroir du frontend)

- `MissionRunStatus = RUNNING | SUCCESS | FAILED | INTERRUPTED`
- `MissionStepStatus = PENDING | COMPLETED | FAILED` (existe déjà côté front)

## Events Transmit à émettre (pour le live)

Le composable `useRobotMission` s'abonne à deux canaux **déjà nommés côté front** :

### `dogs/{dogId}`
```jsonc
{ "type": "robot.telemetry", "state": "<RobotDogState>", "battery": <number> }
```
Quand `state` quitte `IN_MISSION`, le front efface la mission en cours.

### `missions/{missionId}`
```jsonc
{
  "type": "robot.mission_step",
  "missionId": "<uuid>",
  "robotDogId": "<uuid>",   // le front filtre sur robotDogId === dogId courant
  "stepId": "<uuid>",
  "stepStatus": "COMPLETED", // MissionStepStatus
  "runStatus": "RUNNING"     // MissionRunStatus
}
```
À chaque event, le front met à jour le step correspondant puis le status du run
(`withStepStatus(...).withRunStatus(...)`), ce qui recalcule la progression (% de steps `COMPLETED`).

## Portée minimale (« MVP ») vs complète

- **MVP fonctionnel** : les 3 routes + persistance `MissionRun` + passage `IN_MISSION`.
  Suffit pour que le bouton « Démarrer » et le panneau marchent au chargement (sans live).
- **Complet** : + émission Transmit sur les deux canaux + pilotage réel du robot (MQTT) pour
  faire progresser les steps → la barre de progression bouge en temps réel.

## Contrainte

- **Ne pas toucher au module `admin`/backoffice.**
