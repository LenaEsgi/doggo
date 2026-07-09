# Mission Run — Bugfixes Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 3 bugs identifiés dans `StartMissionCommandUseCase` et câbler l'event `MissionStartedEvent` qui est prêt mais mort-né.

**Architecture:** Les use cases vivent dans `app/modules/robot-communication/application/use-cases/commands/`. Les tests unitaires utilisent des fakes en mémoire (`tests/unit/fakes/`) et le runner Japa. Chaque tâche touche un seul fichier de production + son spec existant.

**Tech Stack:** AdonisJS v6, Japa, TypeScript, architecture DDD (domain events via `BaseEvent.dispatch()`).

## Global Constraints

- Ne pas toucher au module `admin`/backoffice.
- Commande de test : `node ace test` (Japa). Filtre par fichier : `node ace test --files "tests/unit/robot-communication/application/commands/start-mission.spec.ts"`.
- Tous les imports utilisent les alias `#app/`, `#dogs/`, `#tests/` définis dans `tsconfig.json`.
- Les erreurs de domaine héritent de `DomainError` (`app/modules/share/exceptions/domain-error`).
- `BaseEvent.dispatch()` est la méthode statique AdonisJS pour émettre un event (pas de `new Event(); emitter.emit()`).

---

### Task 1 : Guard — refus si un run est déjà actif pour ce robot

> **Contexte :** `StartMissionCommandUseCase` ne vérifie pas qu'un `MissionRun` en status `RUNNING` existe déjà en base pour ce robot. L'unique garde actuelle (`dog.startMission() → ensureIdle()`) est contournée si la colonne `state` du robot est désynchronisée (ex : crash entre les deux `save`). Le `FakeMissionRunRepository` supporte déjà `findActiveRunByRobotDog`.

**Files:**
- Modify: `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts`
- Test: `tests/unit/robot-communication/application/commands/start-mission.spec.ts`

**Interfaces:**
- Consumes: `MissionRunRepository.findActiveRunByRobotDog(dogId: string): Promise<MissionRun | null>` (contrat existant)
- Consumes: `InvalidMissionAlreadyRunningError` depuis `#app/modules/missions/domain/exceptions/invalid-mission-already-running.error`
- Produces: `StartMissionCommandUseCase.execute()` lève `InvalidMissionAlreadyRunningError` si un run actif existe

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter ce test dans `tests/unit/robot-communication/application/commands/start-mission.spec.ts`, avant le test `"refuse si le robot n'est pas assigné à la mission"` :

```typescript
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'

// Dans le group, après les imports existants :

test('refuse si le robot a déjà un run actif', async ({ assert }) => {
  const dog = RobotDog.create('SN-001', 'Rex', 80)
  dog.startMission()
  await fakeRepo.save(dog)

  const existingRun = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
  await runRepo.save(existingRun)

  const mission = Mission.create('Patrol', 'user-1')
  mission.addStep('action-1', 'p1')
  await missionRepo.save(mission)
  await missionRepo.assignToDog(mission.id.value, dog.id.value)

  await assert.rejects(
    () => useCase.execute(dog.id.value, mission.id.value),
    InvalidMissionAlreadyRunningError
  )
  assert.lengthOf(fakeMqtt.calls, 0)
})
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
node ace test --files "tests/unit/robot-communication/application/commands/start-mission.spec.ts"
```

Attendu : FAIL sur `"refuse si le robot a déjà un run actif"` — le use case ne lève pas encore `InvalidMissionAlreadyRunningError`.

- [ ] **Step 3 : Implémenter le guard dans le use case**

Dans `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts`, ajouter l'import et le check juste après la vérification du dog (ligne ~36, avant `const isAssigned`).

```typescript
// Ajouter cet import en haut du fichier :
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'

// Dans execute(), après le block "if (!dog)" :
const existingRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)
if (existingRun) {
  throw new InvalidMissionAlreadyRunningError()
}
```

Le fichier `execute()` devient :

```typescript
async execute(dogId: string, missionId?: string): Promise<MissionRun> {
  if (!missionId) {
    throw new InvalidRobotCommandError('missionId is required for START_MISSION command')
  }

  const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
  if (!dog) {
    throw new RobotDogNotFoundError(dogId)
  }

  const existingRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)
  if (existingRun) {
    throw new InvalidMissionAlreadyRunningError()
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

  return run
}
```

- [ ] **Step 4 : Vérifier que tous les tests passent**

```bash
node ace test --files "tests/unit/robot-communication/application/commands/start-mission.spec.ts"
```

Attendu : tous les tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts \
        tests/unit/robot-communication/application/commands/start-mission.spec.ts
git commit -m "fix(mission-run): refuse start if robot already has an active run"
```

---

### Task 2 : Guard — refus si la mission n'a pas de steps

> **Contexte :** Si `mission.missionSteps` est vide, `MissionRun.start()` crée un run avec 0 `runSteps`. `recomputeStatus()` n'est jamais appelé au démarrage, donc le run restera `RUNNING` indéfiniment — aucun event MQTT ne pourra le faire progresser. Le robot serait bloqué en `IN_MISSION` sans pouvoir être arrêté autrement que par `StopMission`.

**Files:**
- Modify: `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts`
- Test: `tests/unit/robot-communication/application/commands/start-mission.spec.ts`

**Interfaces:**
- Consumes: `mission.missionSteps: MissionStep[]` (getter existant sur l'entité `Mission`)
- Consumes: `InvalidRobotCommandError` depuis `#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error`
- Produces: `StartMissionCommandUseCase.execute()` lève `InvalidRobotCommandError` si la mission n'a pas de steps

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter dans `tests/unit/robot-communication/application/commands/start-mission.spec.ts` :

```typescript
test("refuse si la mission n'a pas de steps", async ({ assert }) => {
  const dog = RobotDog.create('SN-001', 'Rex', 80)
  await fakeRepo.save(dog)

  const mission = Mission.create('Empty', 'user-1')
  // Aucun addStep : la mission est vide
  await missionRepo.save(mission)
  await missionRepo.assignToDog(mission.id.value, dog.id.value)

  await assert.rejects(
    () => useCase.execute(dog.id.value, mission.id.value),
    InvalidRobotCommandError
  )
  assert.lengthOf(fakeMqtt.calls, 0)
})
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
node ace test --files "tests/unit/robot-communication/application/commands/start-mission.spec.ts"
```

Attendu : FAIL sur `"refuse si la mission n'a pas de steps"`.

- [ ] **Step 3 : Implémenter le guard**

Dans `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts`, ajouter le guard juste après la vérification de la mission (après `if (!mission)`), avant `dog.startMission()` :

```typescript
if (mission.missionSteps.length === 0) {
  throw new InvalidRobotCommandError('Cannot start a mission with no steps')
}
```

Le bloc complet après `findById` :

```typescript
const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
if (!mission) {
  throw new MissionNotFoundError(missionId)
}

if (mission.missionSteps.length === 0) {
  throw new InvalidRobotCommandError('Cannot start a mission with no steps')
}

dog.startMission()
```

- [ ] **Step 4 : Vérifier que tous les tests passent**

```bash
node ace test --files "tests/unit/robot-communication/application/commands/start-mission.spec.ts"
```

Attendu : tous les tests PASS, dont les deux nouveaux de la Task 1 et Task 2.

- [ ] **Step 5 : Commit**

```bash
git add app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts \
        tests/unit/robot-communication/application/commands/start-mission.spec.ts
git commit -m "fix(mission-run): refuse start if mission has no steps"
```

---

### Task 3 : Câbler MissionStartedEvent

> **Contexte :** `app/modules/notifications/application/listeners/mission-started-sse.listener.ts` existe avec son commentaire `// Stub — sera câblé dans start/events.ts quand MissionStartedEvent existera`. L'event n'a jamais été créé, le listener n'est donc pas enregistré dans `start/events.ts`. Cette task crée l'event, l'émet depuis `StartMissionCommandUseCase`, et branche le listener existant.

**Files:**
- Create: `app/modules/missions/domain/events/mission-started.event.ts`
- Modify: `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts`
- Modify: `start/events.ts`
- Test: `tests/unit/robot-communication/application/commands/start-mission.spec.ts`

**Interfaces:**
- Produces: `MissionStartedEvent(userId, missionId, missionName, robotDogId)` — même forme que `MissionCompletedEvent` (fichier de référence : `app/modules/missions/domain/events/mission-completed.event.ts`)
- Consumes (par `start/events.ts`): `MissionStartedSseListener` depuis `#app/modules/notifications/application/listeners/mission-started-sse.listener`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter dans `tests/unit/robot-communication/application/commands/start-mission.spec.ts` :

```typescript
import MissionStartedEvent from '#app/modules/missions/domain/events/mission-started.event'

// Dans group.each.setup(), après useCase = new StartMissionCommandUseCase(...) :
// Pas de setup additionnel nécessaire — on spy sur BaseEvent.dispatch

test('émet MissionStartedEvent après avoir démarré le run', async ({ assert }) => {
  const dog = RobotDog.create('SN-001', 'Rex', 80)
  await fakeRepo.save(dog)

  const mission = Mission.create('Patrol', 'user-1')
  mission.addStep('action-1', 'p1')
  await missionRepo.save(mission)
  await missionRepo.assignToDog(mission.id.value, dog.id.value)

  const dispatched: unknown[] = []
  const original = MissionStartedEvent.dispatch.bind(MissionStartedEvent)
  MissionStartedEvent.dispatch = async (...args: Parameters<typeof MissionStartedEvent.dispatch>) => {
    dispatched.push(args)
    return original(...args)
  }

  await useCase.execute(dog.id.value, mission.id.value)

  assert.lengthOf(dispatched, 1)
  const [userId, missionId, missionName, robotDogId] = dispatched[0] as string[]
  assert.equal(userId, 'user-1')
  assert.equal(missionId, mission.id.value)
  assert.equal(missionName, 'Patrol')
  assert.equal(robotDogId, dog.id.value)
})
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
node ace test --files "tests/unit/robot-communication/application/commands/start-mission.spec.ts"
```

Attendu : erreur de type (import manquant) ou FAIL sur `"émet MissionStartedEvent"`.

- [ ] **Step 3 : Créer l'event**

Créer `app/modules/missions/domain/events/mission-started.event.ts` :

```typescript
import { BaseEvent } from '@adonisjs/core/events'

export default class MissionStartedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly missionId: string,
    public readonly missionName: string,
    public readonly robotDogId: string
  ) {
    super()
  }
}
```

- [ ] **Step 4 : Émettre l'event dans le use case**

Dans `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts`, ajouter l'import et le dispatch à la fin de `execute()`, après les deux `save` :

```typescript
// Ajouter cet import en haut du fichier :
import MissionStartedEvent from '#app/modules/missions/domain/events/mission-started.event'

// À la fin de execute(), après dogRepository.save(dog) :
void MissionStartedEvent.dispatch(mission.userId, missionId, mission.name, dogId)

return run
```

- [ ] **Step 5 : Vérifier que le test passe**

```bash
node ace test --files "tests/unit/robot-communication/application/commands/start-mission.spec.ts"
```

Attendu : tous les tests PASS.

- [ ] **Step 6 : Brancher le listener dans start/events.ts**

Modifier `start/events.ts` — ajouter l'import de l'event et du listener, puis enregistrer :

```typescript
// Ajouter ces imports avec les autres imports d'events :
import MissionStartedEvent from '#app/modules/missions/domain/events/mission-started.event'

// Ajouter cette ligne avec les autres lazy imports de listeners :
const MissionStartedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-started-sse.listener')

// Ajouter cette ligne avec les autres emitter.listen() :
emitter.listen(MissionStartedEvent, [MissionStartedSseListener])
```

Le fichier `start/events.ts` complet après modification :

```typescript
import emitter from '@adonisjs/core/services/emitter'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
import OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'
import RobotTelemetryReceivedEvent from '#dogs/domain/events/robot-telemetry-received.event'
import MissionStepUpdatedEvent from '#app/modules/missions/domain/events/mission-step-updated.event'
import MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import MissionStartedEvent from '#app/modules/missions/domain/events/mission-started.event'

const DogAssignedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned.listener')

const DogRevokedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-revoked.listener')

const DogAssignedSseListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned-sse.listener')

const DogRevokedSseListener = () =>
  import('#app/modules/notifications/application/listeners/dog-revoked-sse.listener')

const RobotTelemetrySseListener = () =>
  import('#app/modules/notifications/application/listeners/robot-telemetry-sse.listener')

const MissionStepUpdatedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-step-updated-sse.listener')

const MissionCompletedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-completed-sse.listener')

const MissionStartedSseListener = () =>
  import('#app/modules/notifications/application/listeners/mission-started-sse.listener')

emitter.listen(OwnershipAssignedEvent, [DogAssignedListener, DogAssignedSseListener])
emitter.listen(OwnershipRevokedEvent, [DogRevokedListener, DogRevokedSseListener])
emitter.listen(RobotTelemetryReceivedEvent, [RobotTelemetrySseListener])
emitter.listen(MissionStepUpdatedEvent, [MissionStepUpdatedSseListener])
emitter.listen(MissionCompletedEvent, [MissionCompletedSseListener])
emitter.listen(MissionStartedEvent, [MissionStartedSseListener])
```

- [ ] **Step 7 : Lancer la suite complète**

```bash
node ace test
```

Attendu : tous les tests PASS.

- [ ] **Step 8 : Commit**

```bash
git add app/modules/missions/domain/events/mission-started.event.ts \
        app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts \
        start/events.ts \
        tests/unit/robot-communication/application/commands/start-mission.spec.ts
git commit -m "feat(mission-run): add MissionStartedEvent and wire notification listener"
```

---

## Self-Review

**Spec coverage :**
- Bug 1 (double run) → Task 1 ✓
- Bug 2 (mission vide) → Task 2 ✓
- Bug 3 (non-atomicité) → Mitigé par Task 1 : si `save(run)` réussit mais `save(dog)` échoue, le prochain appel à `StartMission` sera bloqué par `findActiveRunByRobotDog`. Pas de tâche dédiée (YAGNI : transaction partagée nécessite refactor des interfaces de repo).
- Bug 4 (MissionStartedEvent mort-né) → Task 3 ✓

**Placeholder scan :** Aucun TBD, TODO ou "implement later".

**Type consistency :**
- `MissionStartedEvent.dispatch(userId, missionId, missionName, robotDogId)` : même signature dans Task 3 Step 3 (constructor), Step 4 (dispatch), et Step 1 (test spy).
- `InvalidMissionAlreadyRunningError` : importé depuis le bon chemin dans Task 1 (test + use case).
- `InvalidRobotCommandError` : importé depuis `#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error` — déjà importé dans le use case existant, pas de nouvelle importation nécessaire.
