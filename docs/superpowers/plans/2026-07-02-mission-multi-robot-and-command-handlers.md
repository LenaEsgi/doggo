# Mission Multi-Robot Domain Fix & Robot Command Handlers Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger deux défauts de clean architecture identifiés dans le module `missions` du backend : (1) la relation N:N `Mission` ↔ `RobotDog` est actuellement gérée en dehors du domaine (champ `Mission.robotDogIds` mort, CRUD direct sur la table pivot), et (2) `SendRobotCommandUseCase` est un god-use-case qui mélange 5 responsabilités indépendantes dans un seul switch.

**Architecture:** `Mission` reste le template partagé (steps ordonnés), assignable à N robots. `MissionRun`/`MissionRunStep` restent la trace d'exécution indépendante par robot (déjà correct). On donne à `Mission` de vraies méthodes métier `assignRobot`/`unassignRobot` avec leurs invariants, et on remplace le switch de `SendRobotCommandUseCase` par un handler par commande (Strategy), orchestrés par un `RobotCommandDispatcher`.

**Tech Stack:** AdonisJS 6, TypeScript, Lucid ORM, Japa (tests), architecture modulaire domain/application/infrastructure.

## Global Constraints

- Ne pas toucher au module `admin`/backoffice.
- Suivre les conventions déjà en place dans `app/modules/missions` et `app/modules/robot-communication` : exports nommés, suffixe `UseCase`, factory `create`/`rehydrate` sur les entités, `@inject()` d'AdonisJS pour la DI, DomainError comme base de toutes les erreurs métier.
- Chaque tâche doit se terminer avec la suite de tests complète au vert : `node ace test unit --files="tests/unit/**/*.spec.ts"` (adapter le glob par tâche, suite complète en tâche finale).
- Hors scope assumé : ajout d'un test DB-réel (fonctionnel) pour `MissionRepositoryImplementation` — aucun précédent de ce type n'existe dans le module `missions` (seul `dogs` a des tests fonctionnels HTTP, avec middleware d'auth non trivial à reproduire). La Tâche 3 modifie l'implémentation réelle mais s'appuie sur les tests de use case (Tâches 6-7, via Fake corrigé) pour valider le comportement métier. Un test fonctionnel dédié pourra être ajouté dans un futur plan si besoin.
- Hors scope assumé : transaction DB inter-agrégats pour `StartMissionCommandUseCase`/`StopMissionCommandUseCase` (persister `MissionRun` et `RobotDog` dans une même transaction). Chaque agrégat garde sa propre frontière de cohérence ; la fenêtre de risque résiduelle (sauvegarde du run OK, sauvegarde du dog KO) est mitigée par la boucle de réconciliation déjà existante (`HandleRobotMissionUpdateUseCase`). Seul le réordonnancement "commande MQTT envoyée avant toute persistance" est traité ici, car c'est lui qui cause les runs fantômes.

---

## Partie 1 — `Mission` ↔ `RobotDog` : faire de l'assignation une vraie opération de domaine

### Task 1: Exception de domaine `RobotAlreadyAssignedError`

**Files:**
- Create: `app/modules/missions/domain/exceptions/robot-already-assigned.error.ts`

**Interfaces:**
- Produces: `RobotAlreadyAssignedError extends DomainError`, constructeur `(missionId: string, robotDogId: string)`.

- [ ] **Step 1: Créer le fichier d'exception**

```ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class RobotAlreadyAssignedError extends DomainError {
  constructor(missionId: string, robotDogId: string) {
    super(`Robot dog ${robotDogId} is already assigned to mission ${missionId}`)
    this.name = 'RobotAlreadyAssignedError'
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur.

- [ ] **Step 3: Commit**

```bash
git add app/modules/missions/domain/exceptions/robot-already-assigned.error.ts
git commit -m "feat(missions): add RobotAlreadyAssignedError domain exception"
```

---

### Task 2: `Mission.assignRobot()` / `Mission.unassignRobot()` avec invariants

**Files:**
- Modify: `app/modules/missions/domain/entities/mission.entity.ts`
- Modify: `tests/unit/mission/domain/mission.spec.ts`

**Interfaces:**
- Consumes: `RobotAlreadyAssignedError` (Task 1), `MissionNotAssignedToRobotError` (existant, `app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error.ts`), `RobotDogId` (existant, `#dogs/domain/value-objects/robot-dog-id`, déjà importé en `type` dans `mission.entity.ts:7`).
- Produces: `mission.assignRobot(robotDogId: RobotDogId): void`, `mission.unassignRobot(robotDogId: RobotDogId): void`. Utilisés par les Tâches 6 et 7.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `tests/unit/mission/domain/mission.spec.ts`, après les imports existants ajouter :

```ts
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotAlreadyAssignedError } from '#app/modules/missions/domain/exceptions/robot-already-assigned.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
```

Puis, avant la fermeture `})` finale du `test.group('Mission entity', ...)` :

```ts
  // -------------------
  // assignRobot / unassignRobot
  // -------------------
  test('should assign a robot to a mission', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotId = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')

    mission.assignRobot(robotId)

    assert.lengthOf(mission.robotDogIds, 1)
    assert.isTrue(mission.robotDogIds[0].equals(robotId))
  })

  test('should assign the same mission to two different robots', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotA = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')
    const robotB = RobotDogId.fromString('a1c1b6c2-4e2a-4b0b-9c3d-9f3a1e2d4c5b')

    mission.assignRobot(robotA)
    mission.assignRobot(robotB)

    assert.lengthOf(mission.robotDogIds, 2)
  })

  test('should throw when assigning an already-assigned robot', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotId = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')
    mission.assignRobot(robotId)

    assert.throws(() => mission.assignRobot(robotId), RobotAlreadyAssignedError)
  })

  test('should unassign a robot from a mission', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotId = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')
    mission.assignRobot(robotId)

    mission.unassignRobot(robotId)

    assert.lengthOf(mission.robotDogIds, 0)
  })

  test('should throw when unassigning a robot that is not assigned', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    const robotId = RobotDogId.fromString('8570f711-2895-4632-9599-281083096058')

    assert.throws(() => mission.unassignRobot(robotId), MissionNotAssignedToRobotError)
  })
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `node ace test unit --files="tests/unit/mission/domain/mission.spec.ts"`
Expected: FAIL — `mission.assignRobot is not a function`.

- [ ] **Step 3: Implémenter `assignRobot`/`unassignRobot` sur `Mission`**

Dans `app/modules/missions/domain/entities/mission.entity.ts`, ajouter les imports en haut du fichier :

```ts
import { RobotAlreadyAssignedError } from '#app/modules/missions/domain/exceptions/robot-already-assigned.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
```

Puis ajouter les deux méthodes juste après `getStepsInOrder()` (avant `private ensureEditable`) :

```ts
  public assignRobot(robotDogId: RobotDogId): void {
    if (this._robotDogIds.some((id) => id.equals(robotDogId))) {
      throw new RobotAlreadyAssignedError(this._id.value, robotDogId.value)
    }
    this._robotDogIds.push(robotDogId)
  }

  public unassignRobot(robotDogId: RobotDogId): void {
    const index = this._robotDogIds.findIndex((id) => id.equals(robotDogId))
    if (index === -1) {
      throw new MissionNotAssignedToRobotError(this._id.value, robotDogId.value)
    }
    this._robotDogIds.splice(index, 1)
  }
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `node ace test unit --files="tests/unit/mission/domain/mission.spec.ts"`
Expected: PASS (tous les tests, anciens et nouveaux).

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/domain/entities/mission.entity.ts tests/unit/mission/domain/mission.spec.ts
git commit -m "feat(missions): add Mission.assignRobot/unassignRobot domain invariants"
```

---

### Task 3: Peupler réellement `robotDogIds` dans `MissionRepositoryImplementation.findById`

**Files:**
- Modify: `app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts:12-27`

**Interfaces:**
- Consumes: relation Lucid `MissionModel.robotDogs` (déjà définie, `app/modules/missions/infrastructure/database/models/mission.ts:17-24`), `RobotDogId.fromString`.
- Produces: `Mission.rehydrate(...)` appelé avec le 5ème paramètre `robotDogIds` correctement rempli quand on charge une mission par id. Utilisé par les Tâches 6 et 7 (`AssignMissionToDogUseCase`/`RemoveMissionToDogUseCase` appellent toutes les deux `findById`).

Note : seul `findById` est corrigé. `findAll`, `findByUser` et `listByRobotDog` restent volontairement légers (ils ne préchargent déjà pas les steps) — ce sont des vues de liste paginées, pas des chargements d'agrégat pour mutation, et rien ne consomme leur `robotDogIds` aujourd'hui. Ajouter le preload partout créerait du N+1 inutile (violation YAGNI).

- [ ] **Step 1: Ajouter l'import `RobotDogId`**

En haut de `app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts`, ajouter :

```ts
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
```

- [ ] **Step 2: Précharger la relation `robotDogs` et la passer à `rehydrate`**

Remplacer la méthode `findById` (lignes 12-27) par :

```ts
  async findById(id: MissionId): Promise<Mission | null> {
    const row = await MissionModel.query()
      .where('id', id.value)
      .preload('steps', (query) => {
        query.orderBy('sequence_order', 'asc')
      })
      .preload('robotDogs')
      .first()

    if (!row) return null

    const steps = row.steps.map((s) =>
      MissionStep.rehydrate(s.id, s.actionId, s.sequenceOrder, s.parameters)
    )
    const robotDogIds = row.robotDogs.map((dog) => RobotDogId.fromString(dog.id))

    return Mission.rehydrate(row.id, row.name, row.userId, steps, robotDogIds)
  }
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur.

- [ ] **Step 4: Commit**

```bash
git add app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts
git commit -m "fix(missions): populate Mission.robotDogIds when loading by id"
```

---

### Task 4: Corriger la signature du contrat `MissionRepository.assignToDog`/`removeFromDog`

**Files:**
- Modify: `app/modules/missions/domain/contracts/mission.repository.ts:14-15`

Le contrat déclare `assignToDog(dogId: string, missionId: string)` alors que l'implémentation réelle (`mission.repository.implementation.ts:145,150`) et tous les appelants utilisent l'ordre `(missionId, dogId)`. TypeScript ne le détecte pas (typage structurel), mais c'est une abstraction qui ment sur elle-même — tout futur développeur qui l'implémente en se fiant à la signature introduira un bug silencieux.

**Interfaces:**
- Produces: `assignToDog(missionId: string, dogId: string): Promise<void>`, `removeFromDog(missionId: string, dogId: string): Promise<void>` — alignés sur l'usage réel.

- [ ] **Step 1: Corriger le contrat**

Dans `app/modules/missions/domain/contracts/mission.repository.ts`, remplacer :

```ts
  abstract assignToDog(dogId: string, missionId: string): Promise<void>
  abstract removeFromDog(dogId: string, missionId: string): Promise<void>
```

par :

```ts
  abstract assignToDog(missionId: string, dogId: string): Promise<void>
  abstract removeFromDog(missionId: string, dogId: string): Promise<void>
```

- [ ] **Step 2: Vérifier la compilation et la suite mission existante**

Run: `npx tsc --noEmit && node ace test unit --files="tests/unit/mission/**/*.spec.ts"`
Expected: PASS (aucun changement de comportement, seulement les noms de paramètres du contrat).

- [ ] **Step 3: Commit**

```bash
git add app/modules/missions/domain/contracts/mission.repository.ts
git commit -m "fix(missions): align MissionRepository.assignToDog/removeFromDog signature with actual usage"
```

---

### Task 5: Corriger `FakeMissionRepository.findById` pour refléter les robots assignés

**Files:**
- Modify: `tests/unit/fakes/fake-mission-repository.ts:10-12`

Le Fake garde aujourd'hui l'assignation dans une `Map` séparée (`missionDogs`) jamais réinjectée dans l'objet `Mission` retourné par `findById`. Pour que les Tâches 6-7 puissent tester `mission.assignRobot()`/`unassignRobot()` de bout en bout via les use cases (comme le ferait la vraie implémentation corrigée en Tâche 3), `findById` doit reconstruire un `Mission` à jour à chaque appel — exactement le même contrat de lecture que la vraie base de données.

**Interfaces:**
- Consumes: `Mission.rehydrate` (5 paramètres, dont `robotDogIds` — Task 2 dépendance indirecte via `Mission`), `RobotDogId.fromString`.
- Produces: `findById` retourne un `Mission` dont `.robotDogIds` reflète l'état courant de `missionDogs`. Utilisé par les Tâches 6 et 7.

- [ ] **Step 1: Ajouter l'import `RobotDogId`**

En haut de `tests/unit/fakes/fake-mission-repository.ts`, ajouter :

```ts
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
```

- [ ] **Step 2: Reconstruire `robotDogIds` à chaque lecture**

Remplacer la méthode `findById` (lignes 10-12) par :

```ts
  async findById(id: MissionId): Promise<Mission | null> {
    const stored = this.storedMissions.find((m) => m.id.equals(id))
    if (!stored) return null

    const robotDogIds = [...(this.missionDogs.get(id.value) ?? [])].map((dogId) =>
      RobotDogId.fromString(dogId)
    )

    return Mission.rehydrate(
      stored.id.value,
      stored.name,
      stored.userId,
      stored.missionSteps,
      robotDogIds
    )
  }
```

- [ ] **Step 3: Lancer la suite mission complète**

Run: `node ace test unit --files="tests/unit/mission/**/*.spec.ts"`
Expected: PASS — le comportement des use cases existants ne change pas encore (ils ne lisent pas `robotDogIds`), seule la donnée retournée par le Fake est maintenant correcte.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/fakes/fake-mission-repository.ts
git commit -m "test(missions): make FakeMissionRepository.findById reflect assigned robots"
```

---

### Task 6: `AssignMissionToDogUseCase` passe par `mission.assignRobot()`

**Files:**
- Modify: `app/modules/missions/application/usecases/assign-mission-to-dog.use-case.ts`
- Modify: `tests/unit/mission/application/assign-mission-to-dog.spec.ts`

**Interfaces:**
- Consumes: `Mission.assignRobot` (Task 2), `RobotDogId.fromString`, repository `findById` corrigé (Task 5 pour le Fake, Task 3 pour la vraie implémentation).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `tests/unit/mission/application/assign-mission-to-dog.spec.ts`, à l'intérieur du `test.group`, après le premier test :

```ts
  test('should throw RobotAlreadyAssignedError when assigning the same robot twice', async ({
    assert,
  }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    dogGateway.addRobot(dogId)

    await useCase.execute(mission.id.value, dogId)

    await assert.rejects(
      () => useCase.execute(mission.id.value, dogId),
      RobotAlreadyAssignedError
    )
  })

  test('should allow the same mission to be assigned to two different robots', async ({
    assert,
  }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogA = '8570f711-2895-4632-9599-281083096058'
    const dogB = 'a1c1b6c2-4e2a-4b0b-9c3d-9f3a1e2d4c5b'

    await repo.save(mission)
    dogGateway.addRobot(dogA)
    dogGateway.addRobot(dogB)

    await useCase.execute(mission.id.value, dogA)
    await useCase.execute(mission.id.value, dogB)

    const resultA = await repo.listByRobotDog(dogA, { page: 1, limit: 10 })
    const resultB = await repo.listByRobotDog(dogB, { page: 1, limit: 10 })
    assert.lengthOf(resultA.data, 1)
    assert.lengthOf(resultB.data, 1)
  })
```

Ajouter l'import en haut du fichier :

```ts
import { RobotAlreadyAssignedError } from '#app/modules/missions/domain/exceptions/robot-already-assigned.error'
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `node ace test unit --files="tests/unit/mission/application/assign-mission-to-dog.spec.ts"`
Expected: FAIL — `should throw RobotAlreadyAssignedError...` échoue car le use case ne valide pas encore cet invariant (le deuxième appel réussirait silencieusement).

- [ ] **Step 3: Faire passer l'agrégat par `assignRobot`**

Remplacer le corps de `execute` dans `app/modules/missions/application/usecases/assign-mission-to-dog.use-case.ts` :

```ts
  async execute(missionId: string, dogId: string): Promise<void> {
    const dog = await this.dogRepository.findBy(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(`Robot Dog with id ${dogId} not found`)
    }
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))

    if (!mission) {
      throw new MissionNotFoundError(missionId)
    }

    mission.assignRobot(RobotDogId.fromString(dogId))

    await this.missionRepository.assignToDog(missionId, dogId)
  }
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `node ace test unit --files="tests/unit/mission/application/assign-mission-to-dog.spec.ts"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/usecases/assign-mission-to-dog.use-case.ts tests/unit/mission/application/assign-mission-to-dog.spec.ts
git commit -m "fix(missions): AssignMissionToDogUseCase enforces Mission.assignRobot invariant"
```

---

### Task 7: `RemoveMissionToDogUseCase` passe par `mission.unassignRobot()`

**Files:**
- Modify: `app/modules/missions/application/usecases/remove-mission-to-dog.use-case.ts`
- Modify: `tests/unit/mission/application/remove-mission-to-dog.spec.ts`

**Interfaces:**
- Consumes: `Mission.unassignRobot` (Task 2).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `tests/unit/mission/application/remove-mission-to-dog.spec.ts`, à la fin du `test.group` :

```ts
  test('should throw MissionNotAssignedToRobotError when the robot was never assigned', async ({
    assert,
  }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    dogGateway.addRobot(dogId)

    await assert.rejects(
      () => useCase.execute(mission.id.value, dogId),
      MissionNotAssignedToRobotError
    )
  })
```

Ajouter l'import en haut du fichier :

```ts
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `node ace test unit --files="tests/unit/mission/application/remove-mission-to-dog.spec.ts"`
Expected: FAIL — aujourd'hui, retirer un robot jamais assigné réussit silencieusement (le `detach()` Lucid sur une ligne inexistante ne lève rien).

- [ ] **Step 3: Faire passer l'agrégat par `unassignRobot`**

Remplacer le corps de `execute` dans `app/modules/missions/application/usecases/remove-mission-to-dog.use-case.ts` :

```ts
  async execute(missionId: string, dogId: string): Promise<void> {
    const dog = await this.dogRepository.findBy(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(`Robot Dog with id ${dogId} not found`)
    }
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))

    if (!mission) {
      throw new MissionNotFoundError(missionId)
    }

    mission.unassignRobot(RobotDogId.fromString(dogId))

    const activeRun = await this.missionRunRepository.findActiveRun(missionId, dogId)
    if (activeRun) {
      throw new InvalidMissionAlreadyRunningError()
    }

    await this.missionRepository.removeFromDog(missionId, dogId)
  }
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `node ace test unit --files="tests/unit/mission/application/remove-mission-to-dog.spec.ts"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/usecases/remove-mission-to-dog.use-case.ts tests/unit/mission/application/remove-mission-to-dog.spec.ts
git commit -m "fix(missions): RemoveMissionToDogUseCase enforces Mission.unassignRobot invariant"
```

---

### Task 8: Exposer `robotDogIds` dans `MissionTransformer`

**Files:**
- Modify: `app/modules/missions/infrastructure/http/transformers/mission.transformer.ts`

Maintenant que `robotDogIds` est réellement peuplé (Task 3), l'API doit l'exposer — sinon le frontend ne peut pas savoir quels robots sont assignés à une mission sans appeler `GET /dogs/:id/missions` pour chaque robot.

**Interfaces:**
- Produces: le JSON de `GET /api/v1/missions/:id` inclut désormais `robotDogIds: string[]`.

- [ ] **Step 1: Ajouter le champ au `toObject()`**

Remplacer le corps de `toObject()` dans `app/modules/missions/infrastructure/http/transformers/mission.transformer.ts` :

```ts
  toObject() {
    return {
      id: this.resource.id.value,
      name: this.resource.name,
      userId: this.resource.userId,
      robotDogIds: this.resource.robotDogIds.map((id) => id.value),
      missionSteps: MissionStepTransformer.transform(this.resource.missionSteps),
    }
  }
```

- [ ] **Step 2: Vérifier la compilation et la suite mission complète**

Run: `npx tsc --noEmit && node ace test unit --files="tests/unit/mission/**/*.spec.ts"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/modules/missions/infrastructure/http/transformers/mission.transformer.ts
git commit -m "feat(missions): expose robotDogIds in MissionTransformer"
```

---

## Partie 2 — Un use case par commande robot

### Task 9: Contrat `RobotCommandHandler` + extraction de `StartMissionCommandUseCase`

**Files:**
- Create: `app/modules/robot-communication/application/contracts/robot-command-handler.ts`
- Create: `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts`
- Create: `tests/unit/robot-communication/application/commands/start-mission.spec.ts`

**Interfaces:**
- Produces: `interface RobotCommandHandler { readonly command: RobotCommand; execute(dogId: string, missionId?: string): Promise<void> }`. `StartMissionCommandUseCase implements RobotCommandHandler`, `command = RobotCommand.START_MISSION`. Consommés par la Tâche 13 (`RobotCommandDispatcher`).

- [ ] **Step 1: Créer le contrat `RobotCommandHandler`**

```ts
import { type RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

export interface RobotCommandHandler {
  readonly command: RobotCommand
  execute(dogId: string, missionId?: string): Promise<void>
}
```

- [ ] **Step 2: Écrire les tests qui échouent (repris de `send-robot-command.spec.ts`, adaptés)**

```ts
import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('StartMissionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let useCase: StartMissionCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    useCase = new StartMissionCommandUseCase(fakeRepo, fakeMqtt, missionRepo, runRepo)
  })

  test('exposes RobotCommand.START_MISSION as its command', ({ assert }) => {
    assert.equal(useCase.command, RobotCommand.START_MISSION)
  })

  test('lève InvalidRobotCommandError si missionId absent', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(() => useCase.execute(dog.id.value), InvalidRobotCommandError)
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('démarre un run quand la mission est assignée au robot', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await useCase.execute(dog.id.value, mission.id.value)

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].missionId, mission.id.value)

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNotNull(run)
    assert.equal(run!.status, MissionRunStatus.RUNNING)
    assert.lengthOf(run!.runSteps, 1)
  })

  test("refuse si le robot n'est pas assigné à la mission", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)

    await assert.rejects(
      () => useCase.execute(dog.id.value, mission.id.value),
      MissionNotAssignedToRobotError
    )
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('envoie la commande MQTT avant de persister le run', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    const callOrder: string[] = []
    const originalSend = fakeMqtt.sendCommand.bind(fakeMqtt)
    fakeMqtt.sendCommand = async (dogId, command, missionId) => {
      callOrder.push('mqtt')
      return originalSend(dogId, command, missionId)
    }
    const originalSave = runRepo.save.bind(runRepo)
    runRepo.save = async (run) => {
      callOrder.push('save-run')
      return originalSave(run)
    }

    await useCase.execute(dog.id.value, mission.id.value)

    assert.deepEqual(callOrder, ['mqtt', 'save-run'])
  })

  test('ne persiste rien si la publication MQTT échoue', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    fakeMqtt.shouldFail = true

    await assert.rejects(() => useCase.execute(dog.id.value, mission.id.value))

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNull(run)
  })
})
```

- [ ] **Step 3: Lancer les tests pour vérifier l'échec**

Run: `node ace test unit --files="tests/unit/robot-communication/application/commands/start-mission.spec.ts"`
Expected: FAIL — le fichier `start-mission.use-case.ts` n'existe pas encore.

- [ ] **Step 4: Implémenter `StartMissionCommandUseCase`**

```ts
import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'

@inject()
export class StartMissionCommandUseCase implements RobotCommandHandler {
  readonly command = RobotCommand.START_MISSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService,
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository
  ) {}

  async execute(dogId: string, missionId?: string): Promise<void> {
    if (!missionId) {
      throw new InvalidRobotCommandError('missionId is required for START_MISSION command')
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    const isAssigned = await this.missionRepository.isAssignedToDog(missionId, dogId)
    if (!isAssigned) {
      throw new MissionNotAssignedToRobotError(missionId, dogId)
    }

    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) {
      throw new MissionNotFoundError(missionId)
    }

    dog.startMission()
    const run = MissionRun.start(
      mission.id,
      dog.id,
      mission.missionSteps.map((step) => step.id)
    )

    await this.communicationService.sendCommand(dogId, this.command, missionId)

    await this.missionRunRepository.save(run)
    await this.dogRepository.save(dog)
  }
}
```

- [ ] **Step 5: Lancer les tests pour vérifier le succès**

Run: `node ace test unit --files="tests/unit/robot-communication/application/commands/start-mission.spec.ts"`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add app/modules/robot-communication/application/contracts/robot-command-handler.ts app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts tests/unit/robot-communication/application/commands/start-mission.spec.ts
git commit -m "refactor(robot-communication): extract StartMissionCommandUseCase from SendRobotCommandUseCase"
```

---

### Task 10: Extraire `StopMissionCommandUseCase`

**Files:**
- Create: `app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case.ts`
- Create: `tests/unit/robot-communication/application/commands/stop-mission.spec.ts`

**Interfaces:**
- Consumes: `RobotCommandHandler` (Task 9).
- Produces: `StopMissionCommandUseCase implements RobotCommandHandler`, `command = RobotCommand.STOP_MISSION`.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'

test.group('StopMissionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let runRepo: FakeMissionRunRepository
  let useCase: StopMissionCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    runRepo = new FakeMissionRunRepository()
    useCase = new StopMissionCommandUseCase(fakeRepo, fakeMqtt, runRepo)
  })

  test('exposes RobotCommand.STOP_MISSION as its command', ({ assert }) => {
    assert.equal(useCase.command, RobotCommand.STOP_MISSION)
  })

  test('interrompt le run actif du robot', async ({ assert }) => {
    let dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startMission()
    await fakeRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)

    await useCase.execute(dog.id.value)

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNull(found)
    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].command, RobotCommand.STOP_MISSION)
  })

  test("refuse si le robot n'a aucun run actif", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(() => useCase.execute(dog.id.value), NoActiveMissionRunError)
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('ne persiste rien si la publication MQTT échoue', async ({ assert }) => {
    let dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startMission()
    await fakeRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)
    fakeMqtt.shouldFail = true

    await assert.rejects(() => useCase.execute(dog.id.value))

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNotNull(found)
    assert.equal(found!.status, 'RUNNING')
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `node ace test unit --files="tests/unit/robot-communication/application/commands/stop-mission.spec.ts"`
Expected: FAIL — le fichier `stop-mission.use-case.ts` n'existe pas encore.

- [ ] **Step 3: Implémenter `StopMissionCommandUseCase`**

```ts
import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'

@inject()
export class StopMissionCommandUseCase implements RobotCommandHandler {
  readonly command = RobotCommand.STOP_MISSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService,
    private readonly missionRunRepository: MissionRunRepository
  ) {}

  async execute(dogId: string): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    const activeRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)
    if (!activeRun) {
      throw new NoActiveMissionRunError(dogId)
    }

    activeRun.interrupt()
    dog.endMission()

    await this.communicationService.sendCommand(dogId, this.command)

    await this.missionRunRepository.save(activeRun)
    await this.dogRepository.save(dog)
  }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `node ace test unit --files="tests/unit/robot-communication/application/commands/stop-mission.spec.ts"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case.ts tests/unit/robot-communication/application/commands/stop-mission.spec.ts
git commit -m "refactor(robot-communication): extract StopMissionCommandUseCase from SendRobotCommandUseCase"
```

---

### Task 11: Extraire `StartSessionCommandUseCase`, `EndSessionCommandUseCase`, `EmergencyStopCommandUseCase`

**Files:**
- Create: `app/modules/robot-communication/application/use-cases/commands/start-session.use-case.ts`
- Create: `app/modules/robot-communication/application/use-cases/commands/end-session.use-case.ts`
- Create: `app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case.ts`
- Create: `tests/unit/robot-communication/application/commands/start-session.spec.ts`
- Create: `tests/unit/robot-communication/application/commands/end-session.spec.ts`
- Create: `tests/unit/robot-communication/application/commands/emergency-stop.spec.ts`

Ces trois commandes sont triviales et de forme identique (pas de dépendance mission) : regroupées dans une seule tâche.

**Interfaces:**
- Produces: `StartSessionCommandUseCase` (`command = START_SESSION`), `EndSessionCommandUseCase` (`command = END_SESSION`), `EmergencyStopCommandUseCase` (`command = EMERGENCY_STOP`), toutes `implements RobotCommandHandler`.

- [ ] **Step 1: Écrire le test qui échoue pour `StartSessionCommandUseCase`**

```ts
import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

test.group('StartSessionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let useCase: StartSessionCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    useCase = new StartSessionCommandUseCase(fakeRepo, fakeMqtt)
  })

  test('exposes RobotCommand.START_SESSION as its command', ({ assert }) => {
    assert.equal(useCase.command, RobotCommand.START_SESSION)
  })

  test('envoie la commande MQTT avant de persister', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const callOrder: string[] = []
    const originalSend = fakeMqtt.sendCommand.bind(fakeMqtt)
    fakeMqtt.sendCommand = async (dogId, command, missionId) => {
      callOrder.push('mqtt')
      return originalSend(dogId, command, missionId)
    }
    const originalSave = fakeRepo.save.bind(fakeRepo)
    fakeRepo.save = async (d) => {
      callOrder.push('save')
      return originalSave(d)
    }

    await useCase.execute(dog.id.value)

    assert.deepEqual(callOrder, ['mqtt', 'save'])
  })

  test('ne persiste pas si la publication MQTT échoue', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)
    fakeMqtt.shouldFail = true

    let saveCalled = false
    fakeRepo.save = async () => {
      saveCalled = true
    }

    await assert.rejects(() => useCase.execute(dog.id.value))
    assert.isFalse(saveCalled)
  })

  test('passe le robot à IN_SESSION', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute(dog.id.value)

    const saved = await fakeRepo.findById(dog.id)
    assert.equal(saved!.state, RobotDogState.IN_SESSION)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node ace test unit --files="tests/unit/robot-communication/application/commands/start-session.spec.ts"`
Expected: FAIL — le fichier `start-session.use-case.ts` n'existe pas encore.

- [ ] **Step 3: Implémenter `StartSessionCommandUseCase`**

```ts
import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'

@inject()
export class StartSessionCommandUseCase implements RobotCommandHandler {
  readonly command = RobotCommand.START_SESSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService
  ) {}

  async execute(dogId: string): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    dog.startSession()

    await this.communicationService.sendCommand(dogId, this.command)

    await this.dogRepository.save(dog)
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `node ace test unit --files="tests/unit/robot-communication/application/commands/start-session.spec.ts"`
Expected: PASS (4 tests).

- [ ] **Step 5: Répéter Steps 1-4 pour `EndSessionCommandUseCase`**

Test (`tests/unit/robot-communication/application/commands/end-session.spec.ts`) — même structure que `start-session.spec.ts`, en remplaçant :
- `StartSessionCommandUseCase` → `EndSessionCommandUseCase`
- `RobotCommand.START_SESSION` → `RobotCommand.END_SESSION`
- dans le test "passe le robot à ...", faire `dog.startSession()` juste après `RobotDog.create(...)` (pour avoir un état `IN_SESSION` à terminer), puis attendre `RobotDogState.IDLE` après `useCase.execute(...)`.

Implémentation (`app/modules/robot-communication/application/use-cases/commands/end-session.use-case.ts`) :

```ts
import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'

@inject()
export class EndSessionCommandUseCase implements RobotCommandHandler {
  readonly command = RobotCommand.END_SESSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService
  ) {}

  async execute(dogId: string): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    dog.endSession()

    await this.communicationService.sendCommand(dogId, this.command)

    await this.dogRepository.save(dog)
  }
}
```

Run: `node ace test unit --files="tests/unit/robot-communication/application/commands/end-session.spec.ts"`
Expected: PASS (4 tests).

- [ ] **Step 6: Répéter Steps 1-4 pour `EmergencyStopCommandUseCase`**

Test (`tests/unit/robot-communication/application/commands/emergency-stop.spec.ts`) — même structure, en remplaçant :
- `RobotCommand.START_SESSION` → `RobotCommand.EMERGENCY_STOP`
- dans le test "passe le robot à ...", attendre `RobotDogState.ERROR` après `useCase.execute(...)`.

Implémentation (`app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case.ts`) :

```ts
import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'

@inject()
export class EmergencyStopCommandUseCase implements RobotCommandHandler {
  readonly command = RobotCommand.EMERGENCY_STOP

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService
  ) {}

  async execute(dogId: string): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    dog.markError()

    await this.communicationService.sendCommand(dogId, this.command)

    await this.dogRepository.save(dog)
  }
}
```

Run: `node ace test unit --files="tests/unit/robot-communication/application/commands/emergency-stop.spec.ts"`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add app/modules/robot-communication/application/use-cases/commands/start-session.use-case.ts app/modules/robot-communication/application/use-cases/commands/end-session.use-case.ts app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case.ts tests/unit/robot-communication/application/commands/start-session.spec.ts tests/unit/robot-communication/application/commands/end-session.spec.ts tests/unit/robot-communication/application/commands/emergency-stop.spec.ts
git commit -m "refactor(robot-communication): extract session and emergency-stop command use cases"
```

---

### Task 12: `RobotCommandDispatcher` + branchement du contrôleur

**Files:**
- Create: `app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case.ts`
- Create: `tests/unit/robot-communication/application/robot-command-dispatcher.spec.ts`
- Modify: `app/modules/robot-communication/infrastructure/http/controllers/send-robot-command.controller.ts`

**Interfaces:**
- Consumes: les 5 handlers des Tâches 9-11.
- Produces: `RobotCommandDispatcher.execute(dogId: string, payload: RobotCommandPayload): Promise<void>` — même signature que l'ancien `SendRobotCommandUseCase.execute`, donc le contrôleur ne change qu'un import et un nom de classe.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { test } from '@japa/runner'
import { RobotCommandDispatcher } from '#app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { EmergencyStopCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'

function fakeHandler(command: RobotCommand) {
  const calls: Array<{ dogId: string; missionId?: string }> = []
  return {
    command,
    calls,
    execute: async (dogId: string, missionId?: string) => {
      calls.push({ dogId, missionId })
    },
  }
}

test.group('RobotCommandDispatcher', () => {
  test('route vers le handler correspondant au type de commande', async ({ assert }) => {
    const startMission = fakeHandler(RobotCommand.START_MISSION)
    const stopMission = fakeHandler(RobotCommand.STOP_MISSION)
    const startSession = fakeHandler(RobotCommand.START_SESSION)
    const endSession = fakeHandler(RobotCommand.END_SESSION)
    const emergencyStop = fakeHandler(RobotCommand.EMERGENCY_STOP)

    const dispatcher = new RobotCommandDispatcher(
      startMission as unknown as StartMissionCommandUseCase,
      stopMission as unknown as StopMissionCommandUseCase,
      startSession as unknown as StartSessionCommandUseCase,
      endSession as unknown as EndSessionCommandUseCase,
      emergencyStop as unknown as EmergencyStopCommandUseCase
    )

    await dispatcher.execute('dog-1', { type: RobotCommand.START_SESSION })

    assert.lengthOf(startSession.calls, 1)
    assert.lengthOf(startMission.calls, 0)
    assert.equal(startSession.calls[0].dogId, 'dog-1')
  })

  test('transmet le missionId au handler', async ({ assert }) => {
    const startMission = fakeHandler(RobotCommand.START_MISSION)
    const dispatcher = new RobotCommandDispatcher(
      startMission as unknown as StartMissionCommandUseCase,
      fakeHandler(RobotCommand.STOP_MISSION) as unknown as StopMissionCommandUseCase,
      fakeHandler(RobotCommand.START_SESSION) as unknown as StartSessionCommandUseCase,
      fakeHandler(RobotCommand.END_SESSION) as unknown as EndSessionCommandUseCase,
      fakeHandler(RobotCommand.EMERGENCY_STOP) as unknown as EmergencyStopCommandUseCase
    )

    await dispatcher.execute('dog-1', { type: RobotCommand.START_MISSION, missionId: 'm-1' })

    assert.equal(startMission.calls[0].missionId, 'm-1')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node ace test unit --files="tests/unit/robot-communication/application/robot-command-dispatcher.spec.ts"`
Expected: FAIL — `robot-command-dispatcher.use-case.ts` n'existe pas encore.

- [ ] **Step 3: Implémenter `RobotCommandDispatcher`**

```ts
import { inject } from '@adonisjs/core'
import { RobotCommand, type RobotCommandPayload } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { EmergencyStopCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'

@inject()
export class RobotCommandDispatcher {
  private readonly handlers: Map<RobotCommand, RobotCommandHandler>

  constructor(
    startMission: StartMissionCommandUseCase,
    stopMission: StopMissionCommandUseCase,
    startSession: StartSessionCommandUseCase,
    endSession: EndSessionCommandUseCase,
    emergencyStop: EmergencyStopCommandUseCase
  ) {
    this.handlers = new Map<RobotCommand, RobotCommandHandler>([
      [startMission.command, startMission],
      [stopMission.command, stopMission],
      [startSession.command, startSession],
      [endSession.command, endSession],
      [emergencyStop.command, emergencyStop],
    ])
  }

  async execute(dogId: string, payload: RobotCommandPayload): Promise<void> {
    const handler = this.handlers.get(payload.type)
    if (!handler) {
      throw new InvalidRobotCommandError(`Unsupported robot command: ${payload.type}`)
    }
    await handler.execute(dogId, payload.missionId)
  }
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `node ace test unit --files="tests/unit/robot-communication/application/robot-command-dispatcher.spec.ts"`
Expected: PASS (2 tests).

- [ ] **Step 5: Brancher le contrôleur sur le dispatcher**

Dans `app/modules/robot-communication/infrastructure/http/controllers/send-robot-command.controller.ts`, remplacer l'import et l'injection :

```ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { sendRobotCommandValidator } from '../validators/send-robot-command.validator.js'
import { RobotCommandDispatcher } from '#app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class SendRobotCommandController {
  constructor(private robotCommandDispatcher: RobotCommandDispatcher) {}

  public async handle({ request, params, response, logger, bouncer }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('sendCommand', params.id)

    const payload = await request.validateUsing(sendRobotCommandValidator)

    logger.info({ dogId: params.id, command: payload.type }, 'SendRobotCommandController called')

    await this.robotCommandDispatcher.execute(params.id, {
      type: payload.type,
      missionId: payload.missionId,
    })

    logger.info({ dogId: params.id, command: payload.type }, 'SendRobotCommandController completed')

    return response.noContent()
  }
}
```

- [ ] **Step 6: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur.

- [ ] **Step 7: Commit**

```bash
git add app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case.ts tests/unit/robot-communication/application/robot-command-dispatcher.spec.ts app/modules/robot-communication/infrastructure/http/controllers/send-robot-command.controller.ts
git commit -m "refactor(robot-communication): route commands through RobotCommandDispatcher"
```

---

### Task 13: Supprimer `SendRobotCommandUseCase` et vérifier la suite complète

**Files:**
- Delete: `app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts`
- Delete: `tests/unit/robot-communication/application/send-robot-command.spec.ts`

Ce fichier n'est plus référencé par aucun contrôleur (Task 12) ni par aucun autre use case (vérifié en Task 12 : `grep` ne doit plus rien trouver en dehors des fichiers à supprimer).

- [ ] **Step 1: Vérifier qu'aucune référence ne subsiste**

Run: `grep -rln "SendRobotCommandUseCase" app tests --include="*.ts"`
Expected: seuls les deux fichiers à supprimer apparaissent.

- [ ] **Step 2: Supprimer les fichiers**

```bash
git rm app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts
git rm tests/unit/robot-communication/application/send-robot-command.spec.ts
```

- [ ] **Step 3: Lancer la suite unitaire complète**

Run: `node ace test unit`
Expected: PASS — tous les tests passent (y compris la Tâche du Task 3 de la Partie 1 : `show-mission.spec.ts` reste préexistant et cassé, hors scope de ce plan — voir note ci-dessous).

Note : le test `tests/unit/mission/application/show-mission.spec.ts` échoue déjà avant ce plan (il attend `InvalidMissionNotFountError`, une classe d'erreur dupliquée jamais levée par le code réel, qui lève `MissionNotFoundError`). Ce n'est pas introduit par ce plan et n'est pas dans son scope — à traiter séparément (fusionner les deux classes d'erreur dupliquées `invalid-mission-not-fout.error.ts` / `invalid-mission-not-fount.error.ts`).

- [ ] **Step 4: Vérifier la compilation complète**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(robot-communication): remove SendRobotCommandUseCase, replaced by per-command handlers"
```

---

## Self-Review

**Couverture du besoin exprimé :**
- "la relation robot mission est N:N, c'est cet aspect qui est à corriger" → Tâches 1-8 (invariants sur `Mission`, lecture/écriture correcte de `robotDogIds`, contrat cohérent).
- "SendRobotCommand ne me plait pas, chaque commande devrait être un use case" → Tâches 9-13 (5 use cases + dispatcher, ordre MQTT-avant-persistance corrigé au passage sur les 2 handlers qui touchent une mission).

**Cohérence des types/signatures entre tâches :** `Mission.assignRobot(RobotDogId)`/`unassignRobot(RobotDogId)` (Task 2) utilisés identiquement en Tâches 6-7. `RobotCommandHandler.execute(dogId: string, missionId?: string)` (Task 9) implémenté à l'identique par les 5 handlers (Tâches 9-11) et consommé par `RobotCommandDispatcher` (Task 12).
