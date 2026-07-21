# Fiabilisation du CRUD Actions — Design

**Statut :** Validé
**Date :** 2026-07-21

## Contexte

Le module `app/modules/actions/` expose déjà un CRUD complet (`create`/`index`/`show`/`update`/`destroy`) sur `/api/v1/actions`, avec policy Bouncer réservant l'écriture aux `ADMIN`. Ce CRUD est câblé de bout en bout : les `mission_steps` référencent une `Action` par `action_id`, et au démarrage d'une mission (`StartMissionCommandUseCase`), le backend résout `action.code` + valide les `parameters` contre `action.parameterSchema`, puis envoie `{ actionCode, parameters }` au robot par MQTT. Le firmware ne connaît jamais l'UUID ni le schéma — seulement le `code`.

Ce CRUD a été écrit il y a plusieurs mois et n'a jamais été audité ni utilisé en pratique (le frontend ne consomme que `GET /actions` pour la palette de sélection dans le constructeur de mission ; aucune UI n'appelle `create`/`update`/`destroy`). Un audit a révélé deux failles réelles :

1. **`mission_steps.action_id` a une FK `ON DELETE CASCADE` vers `actions.id`**, et `DestroyActionUseCase` ne vérifie jamais si l'action est utilisée. Appeler `DELETE /api/v1/actions/:id` sur une action référencée par au moins un `mission_step` efface silencieusement ces `mission_steps` — et par cascade descendante, les `mission_run_steps` associés, donc de l'historique de missions déjà exécutées.
2. **`UpdateActionUseCase` permet de modifier `parameterSchema` sans aucune vérification**, y compris sur une action déjà référencée par des `mission_steps` existants dont les `parameters` stockés ont été validés contre l'ancien schéma. Aucune revalidation ni migration n'est faite : les données existantes peuvent devenir silencieusement incohérentes avec le schéma courant.

Un troisième point mineur : le transformer HTTP n'expose pas `slug` dans les réponses JSON, alors que le champ existe en DB et dans l'entité.

Cette spec couvre uniquement la fiabilisation du module `actions` existant (et son point d'intégration avec `missions`). La conception d'un système de compatibilité action ↔ version/modèle de robot (aucune notion de version/firmware n'existe aujourd'hui dans le domaine `dogs` ni dans le protocole MQTT) est explicitement **hors scope** et fera l'objet d'une spec séparée.

## Décisions

### 1. Désactivation logique au lieu de suppression physique

- Migration : ajout de la colonne `actions.is_active boolean not null default true`.
- La FK `mission_steps.action_id → actions.id` passe de `ON DELETE CASCADE` à `ON DELETE RESTRICT`. Le hard-delete physique n'est plus un chemin normal de l'application ; RESTRICT sert de filet de sécurité si un `DELETE` SQL direct était tenté (script, seeder) sur une action utilisée.
- `DELETE /api/v1/actions/:id` (`DestroyActionUseCase`) devient une désactivation (`is_active = false`). Jamais bloquée par l'usage : désactiver une action déjà utilisée est sans danger, ça ne touche que sa disponibilité pour de *nouveaux* steps.
- Nouvel endpoint `PATCH /api/v1/actions/:id/toggle` (body `{ isActive: boolean }`), sur le modèle exact de `ToggleMissionScheduleController`/`ToggleMissionScheduleUseCase` déjà présent dans le module `missions` : `ToggleActionController`, `ToggleActionUseCase`, `ToggleActionDto`, `ToggleActionValidator`. Permet de réactiver une action désactivée (ou de la désactiver, en alternative symétrique à `DELETE`).

### 2. `code` devient éditable

- `UpdateActionValidator` accepte désormais `code` (mêmes règles que `create` : `minLength(1)`, `trim`, `maxLength(100)`).
- `UpdateActionUseCase` vérifie l'unicité du nouveau `code` (même contrôle que `CreateActionUseCase`, réutilise `ActionAlreadyExistsError` 409 si un autre enregistrement porte déjà ce code) avant d'appliquer le changement.
- Sans risque pour les runs en cours : `StartMissionCommandUseCase` résout et fige `actionCode` dans le payload MQTT au moment du démarrage de la mission ; modifier `code` après coup n'affecte que les prochains lancements, jamais un run déjà en `IN_MISSION`/`PENDING`.
- La question de savoir si un changement de `code` doit un jour déclencher une notion de "nouvelle version" d'action (liée à la compatibilité firmware) reste ouverte et sera traitée dans la spec de versioning (hors scope ici).

### 3. `parameterSchema` verrouillé si l'action est utilisée

- `name`, `description`, `slug`, `code` restent librement éditables en toutes circonstances.
- `parameterSchema` ne peut être modifié que si l'action n'est référencée par **aucun** `mission_step`. Sinon, `UpdateActionUseCase` lève une nouvelle erreur de domaine `ActionParameterSchemaLockedError` (409) — l'admin doit désactiver cette action et en créer une nouvelle si le schéma doit changer structurellement.
- Vérification d'usage via un nouveau contrat `MissionStepUsageGateway` (`app/modules/actions/domain/contracts/mission-step-usage.gateway.ts`, méthode `isActionUsed(actionId: string): Promise<boolean>`), implémenté dans `app/modules/actions/infrastructure/gateways/mission-step-usage.gateway.implementation.ts` (requête sur la table `mission_steps`), et wiré dans `providers/action_provider.ts`. Ce pattern reproduit celui déjà utilisé par le module `missions` pour ses propres dépendances externes (`RobotDogGateway`, `UserGateway`), en respectant la séparation de modules de l'ADR-002 : le module `actions` ne dépend pas directement des internals du module `missions`.

### 4. Visibilité filtrée par statut

- `GET /api/v1/actions` (`IndexActionUseCase`) ne retourne que les actions actives par défaut — comportement inchangé pour l'`ActionPalette` utilisateur.
- Paramètre de requête optionnel `includeInactive=true` : honoré uniquement si l'utilisateur authentifié est `ADMIN` (silencieusement ignoré sinon, pas d'erreur — évite de révéler l'existence du paramètre à un non-admin).
- `GET /api/v1/actions/:id` (`ShowActionUseCase`) reste inchangé : accessible même si l'action est désactivée (nécessaire pour que l'admin puisse la consulter/gérer).

### 5. Garde-fou côté `missions`

- `AddMissionStepUseCase` et `SyncMissionStepsUseCase` doivent refuser d'assigner une action désactivée (`is_active = false`) à un **nouveau** `mission_step` — nouvelle erreur de domaine `ActionNotAvailableError` (409), levée après le `findById` existant sur l'`ActionRepository`, avant `validateParameters`.
- Les `mission_steps` déjà existants référençant une action entre-temps désactivée continuent de fonctionner normalement (édition d'une mission existante sans toucher à ce step, exécution d'une mission déjà planifiée).

### 6. Correction mineure

- `action.transformer.ts` : ajoute `slug` à la sortie JSON (`toObject()`), actuellement absent malgré son existence en DB/entité.

### 7. Tests

- Ajout de tests fonctionnels/HTTP (`tests/functional/actions/`) couvrant les 6 routes (`create`, `index` avec/sans `includeInactive`, `show`, `update` avec les nouvelles règles, `toggle`, `destroy`→désactivation), y compris les cas d'autorisation (403 pour un non-admin sur `create`/`update`/`toggle`/`destroy`) — aucun test de ce niveau n'existe aujourd'hui pour ce module (seulement des tests unitaires sur les use cases et l'entité).
- Ajout de tests unitaires pour les nouveaux comportements : `ActionParameterSchemaLockedError` dans `UpdateActionUseCase`, `ToggleActionUseCase`, `ActionNotAvailableError` dans `AddMissionStepUseCase`/`SyncMissionStepsUseCase`.

## Hors scope

- Système de compatibilité action ↔ version/modèle de robot (aucune notion de version/firmware n'existe aujourd'hui sur `robot_dogs` ni dans le protocole MQTT — à concevoir séparément).
- Toute UI d'administration frontend pour gérer les actions (demande explicitement limitée au backend pour cette phase).
