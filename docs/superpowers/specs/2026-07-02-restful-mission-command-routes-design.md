# RESTful Mission Command Routes — Design

**Date:** 2026-07-02
**Status:** Approved (design)

## Contexte & objectif

Aujourd'hui, toutes les commandes envoyées à un robot dog passent par un endpoint unique de type command-bus :

```
POST /api/v1/dogs/:id/commands   { type: RobotCommand, missionId? }
```

Ce contrôleur route un payload polymorphe vers un `RobotCommandDispatcher`, qui délègue à l'un des 5 handlers (`StartMission`, `StopMission`, `StartSession`, `EndSession`, `EmergencyStop`).

**Problèmes :**
- Le verbe métier est caché dans le body (`type`), l'API n'est pas découvrable.
- Un seul endpoint mélange des concepts métier distincts et **mutuellement exclusifs** : le cycle de vie d'une **mission** (le robot exécute des étapes de façon autonome) et le cycle de vie d'une **session** (l'utilisateur pilote le robot en direct).
- Contrat OpenAPI flou (body polymorphe).

**Objectif :** exposer le cycle de vie **mission** via des routes RESTful dédiées, et supprimer la couche command-bus. Le frontend ne consomme encore aucune de ces routes : **pas de contrainte de rétrocompatibilité**.

## Décisions actées (via brainstorming)

1. **Modèle « action sur le dog »** : le dog n'a qu'une mission active à la fois ; l'arrêt vise la mission active sans avoir besoin du `runId`.
2. **Réponses mixtes** : démarrer une mission renvoie `201` + le `MissionRun` créé ; arrêter renvoie `200` + le `RobotDog` à jour.
3. **Retour = entité de domaine + Transformer** (pas de DTO applicatif), pour rester cohérent avec `ShowMissionUseCase` qui renvoie déjà l'entité et laisse le Transformer produire le JSON. Le Transformer est la frontière domaine → HTTP dans ce codebase.
4. **Suppression complète du command-bus** (dispatcher, contrôleur générique, validator générique, route `/commands`, interface `RobotCommandHandler`).
5. **Session : conservée mais non exposée.** Les use cases `StartSession`/`EndSession` restent dans le code (avec leurs tests) pour un futur mode session, mais aucune route ne les appelle dans ce chantier.
6. **Emergency-stop : supprimé** (jugé inutile).
7. **Renommage de la policy** : `RobotDogPolicy.sendCommand` (nom hérité du command-bus) est remplacé par deux méthodes alignées sur la convention « une méthode par action » du codebase : `startMission` et `stopMission`.

## Scope

**Dans le scope :**
- 2 routes REST mission (start / stop) + 2 contrôleurs fins.
- Un `MissionRunTransformer` (n'existe pas aujourd'hui).
- Modification des use cases `StartMission`/`StopMission` pour renvoyer l'entité.
- Suppression du command-bus et d'`EmergencyStop`.

**Hors scope :**
- Exposer les routes session (le mode session sera un chantier ultérieur).
- Migrer les autres use cases du projet vers un pattern DTO.
- Les 2 tests préexistants cassés (`show-mission.spec`, `list-user-robot-dogs.controller.spec`) — hors sujet.

## Table des routes

Toutes sous le groupe `/api/v1/dogs/:id`, middleware `firebaseAuth`, autorisation par ownership.

| Méthode & route | Body | Succès | Use case | Policy |
|---|---|---|---|---|
| `POST /api/v1/dogs/:id/mission` | `{ missionId: uuid }` | `201 Created` + `MissionRun` sérialisé | `StartMissionCommandUseCase` | `RobotDogPolicy.startMission` |
| `DELETE /api/v1/dogs/:id/mission` | — | `200 OK` + `RobotDog` sérialisé | `StopMissionCommandUseCase` | `RobotDogPolicy.stopMission` |

### Comportement `POST /dogs/:id/mission`
Inchangé côté logique métier (déjà implémenté) :
1. `missionId` requis (validator) → sinon `422`.
2. Autorisation ownership → sinon `403`.
3. Dog existe → sinon `404` (`RobotDogNotFoundError`).
4. Mission assignée au dog (`isAssignedToDog`) → sinon `MissionNotAssignedToRobotError`.
5. Mission existe → sinon `MissionNotFoundError`.
6. `dog.startMission()` (exige ONLINE + IDLE + batterie ≥ 10 %) → sinon `InvalidDogStateError` / `BatteryTooLowError`.
7. Publie la commande MQTT `start_mission`, puis persiste le `MissionRun` (RUNNING) et le dog.
8. Renvoie `201` + le `MissionRun`.

### Comportement `DELETE /dogs/:id/mission`
Inchangé côté logique métier (déjà implémenté, ordre MQTT-avant-mutation) :
1. Autorisation ownership → sinon `403`.
2. Dog existe → sinon `404`.
3. Run actif du dog existe (`findActiveRunByRobotDog`) → sinon `NoActiveMissionRunError`.
4. Publie la commande MQTT `stop_mission`, puis `run.interrupt()` + `dog.endMission()`, puis persiste.
5. Renvoie `200` + le `RobotDog` à jour.

## Impact fichier par fichier

### Supprimé
- `app/modules/robot-communication/infrastructure/http/controllers/send-robot-command.controller.ts`
- `app/modules/robot-communication/infrastructure/http/validators/send-robot-command.validator.ts`
- `app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case.ts`
- `tests/unit/robot-communication/application/robot-command-dispatcher.spec.ts`
- `app/modules/robot-communication/application/contracts/robot-command-handler.ts`
- `app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case.ts`
- `tests/unit/robot-communication/application/commands/emergency-stop.spec.ts`
- La route `POST /:id/commands` dans `routes.v1.ts`.

### Modifié
- **`StartMissionCommandUseCase`** : `execute(dogId, missionId?)` renvoie désormais `Promise<MissionRun>` (retourne le `run` créé). Retire `implements RobotCommandHandler`. Conserve `readonly command = RobotCommand.START_MISSION` (utilisé pour la publication MQTT).
- **`StopMissionCommandUseCase`** : `execute(dogId)` renvoie `Promise<RobotDog>` (retourne le `dog` à jour). Retire `implements RobotCommandHandler`. Conserve `readonly command`.
- **`StartSessionCommandUseCase`** / **`EndSessionCommandUseCase`** : retirent uniquement `implements RobotCommandHandler` (l'interface est supprimée). Inchangés sinon (toujours `Promise<void>`, conservés pour un futur usage). Leurs tests restent verts.
- **`app/modules/robot-communication/infrastructure/http/routes.v1.ts`** : remplace la route `/commands` par les 2 routes mission.
- **`app/modules/dogs/application/policies/robot-dog.policy.ts`** : supprime `sendCommand`, ajoute `startMission(user, robotDogId)` et `stopMission(user, robotDogId)` (même corps `isOwner`), suivant la convention « une méthode par action ».
- Tests `start-mission.spec.ts` / `stop-mission.spec.ts` : ajustent les assertions pour vérifier l'entité retournée (le run RUNNING / le dog IDLE) en plus des effets existants.

### Créé
- **`StartMissionController`** (`.../http/controllers/start-mission.controller.ts`) : injecte `StartMissionCommandUseCase`, autorise via `RobotDogPolicy.startMission`, valide le body, appelle `execute`, renvoie `201` + `MissionRunTransformer.transform(run)`.
- **`StopMissionController`** (`.../http/controllers/stop-mission.controller.ts`) : injecte `StopMissionCommandUseCase`, autorise via `RobotDogPolicy.stopMission`, appelle `execute`, renvoie `200` + `RobotDogTransformer.transform(dog)`.
- **`MissionRunTransformer`** (`app/modules/missions/infrastructure/http/transformers/mission-run.transformer.ts`) : sérialise un `MissionRun` → `{ id, missionId, robotDogId, status, startedAt, endedAt, runSteps }`. Les `runSteps` sont des `MissionRunStep` ; leur forme sérialisée sera définie dans le plan (en s'inspirant du pattern de `MissionStepTransformer`, mais sur l'entité `MissionRunStep`).
- **`tests/unit/missions/.../mission-run.transformer.spec.ts`** : test unitaire du transformer.
- **`start-mission.validator.ts`** (`.../http/validators/start-mission.validator.ts`) : `vine.object({ missionId: vine.string().uuid() })`.

## Interface `RobotDog` / `RobotDogTransformer`

`RobotDogTransformer` existe déjà et est réutilisé pour la réponse `DELETE`. Aucune modification attendue ; s'il manque un champ d'état utile, on s'appuie sur sa forme actuelle (pas d'extension dans ce scope).

## Gestion des erreurs

Aucune nouvelle erreur métier. Toutes les erreurs de domaine héritent de `DomainError` et sont déjà mappées vers des codes HTTP par le handler d'exceptions existant (ex. `InvalidRobotCommandError` → 422). Le retrait du command-bus ne change pas ce mapping. `InvalidRobotCommandError` (levé auparavant pour un `type` inconnu au niveau dispatcher) n'est plus nécessaire à ce niveau — la route elle-même définit l'action ; il reste levé par `StartMission` si `missionId` est absent après validation (garde défensive conservée).

## Stratégie de test

- **Use cases** (`start-mission`, `stop-mission`) : tests existants conservés, assertions enrichies sur l'entité retournée. Les tests session restent inchangés.
- **Transformer** : test unitaire dédié du `MissionRunTransformer`.
- **Contrôleurs** : pas de test HTTP fonctionnel dédié (le mock `bouncer` des tests contrôleurs du module `dogs` est cassé, cf. `list-user-robot-dogs.controller.spec`). On suit le pattern du module `missions` : couverture par les tests de use case + transformer. Un test fonctionnel HTTP pourra être ajouté dans un futur chantier une fois le mock `bouncer` réparé.
- Suite complète au vert (hors 2 échecs préexistants documentés).

## Vérification finale attendue
- `npx tsc --noEmit` sans nouvelle erreur.
- `node ace test unit` : mêmes 2 échecs préexistants, aucun nouveau.
- Aucune référence résiduelle à `RobotCommandDispatcher`, `RobotCommandHandler`, `SendRobotCommandController`, `EmergencyStopCommandUseCase`, ni à `RobotDogPolicy.sendCommand` (`grep`).
