# MQTT Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 4 bugs MQTT identifiés dans le backend AdonisJS : le provider MQTT tourne en environnement test, l'état DB est persisté avant la publication MQTT, `sendCommand` ne vérifie pas si le client est connecté, et `START_MISSION` n'exige pas de `missionId`.

**Architecture:** Backend AdonisJS v6, module `robot-communication` en Clean Architecture. Les use cases sont testés via fakes (pas de mocks de librairie externe). `MqttServiceImplementation` est testé indirectement via la couche use case à l'aide d'un `FakeCommunicationService`.

**Tech Stack:** AdonisJS v6, TypeScript, Japa (test runner), `mqtt` v5.x, VineJS.

## Global Constraints

- Tous les tests s'exécutent depuis `/Users/arthurmorelon/WebstormProjects/fantom609/doggo/backend` avec `node ace test unit`
- Pattern de test : `test.group`, `group.each.setup`, fake classes qui étendent les abstractions (voir `tests/unit/fakes/`)
- Pas de mock de librairie (ex: `vi.mock`) — on étend la classe abstraite comme `FakeRobotDogRepository`
- Ne pas toucher au module admin/backoffice
- `RobotDog.create('SN-XXX', 'Name', 80)` crée un dog en état `IDLE` avec batterie=80 — utilisable directement dans les tests sans setup supplémentaire

---

### Task 1 — Restriction du MqttProvider à l'environnement web

**Files:**
- Modify: `adonisrc.ts:75`

**Interfaces:**
- Consumes: rien
- Produces: le provider MQTT n'est plus chargé en environnement `test`, ce qui évite des tentatives de connexion à un broker inexistant pendant les tests

- [ ] **Step 1: Modifier la déclaration du provider dans adonisrc.ts**

Remplacer la ligne 75 :

```ts
// avant
() => import('#providers/mqtt_provider'),

// après
{
  file: () => import('#providers/mqtt_provider'),
  environment: ['web', 'console'],
},
```

- [ ] **Step 2: Vérifier que les tests tournent sans broker MQTT**

```bash
node ace test unit
```

Attendu : aucune erreur de connexion MQTT dans les logs, tous les tests passent (281+ tests, pas de régression).

- [ ] **Step 3: Commit**

```bash
git add adonisrc.ts
git commit -m "fix: restrict MqttProvider to web and console environments"
```

---

### Task 2 — FakeCommunicationService + garde client déconnecté + ordre publish/save

**Files:**
- Create: `tests/unit/fakes/fake-robot-communication-service.ts`
- Create: `tests/unit/robot-communication/application/send-robot-command.spec.ts`
- Modify: `app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts` (méthode `sendCommand`)
- Modify: `app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts` (inversion lignes 43-44)

**Interfaces:**
- Consumes: `RobotCommunicationService` (abstract class du contrat domaine), `FakeRobotDogRepository`
- Produces: `FakeRobotCommunicationService` — réutilisée dans Task 3 pour tester la validation

- [ ] **Step 1: Créer FakeRobotCommunicationService**

Créer `tests/unit/fakes/fake-robot-communication-service.ts` :

```ts
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { type RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

export class FakeRobotCommunicationService extends RobotCommunicationService {
  public calls: { dogId: string; command: RobotCommand; missionId?: string }[] = []
  public shouldFail = false

  async sendCommand(dogId: string, command: RobotCommand, missionId?: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('MQTT client is not connected')
    }
    this.calls.push({ dogId, command, missionId })
  }
}
```

- [ ] **Step 2: Écrire les tests qui vont échouer**

Créer `tests/unit/robot-communication/application/send-robot-command.spec.ts` :

```ts
import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { SendRobotCommandUseCase } from '#app/modules/robot-communication/application/use-cases/send-robot-command.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

test.group('SendRobotCommandUseCase — ordering', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let useCase: SendRobotCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    useCase = new SendRobotCommandUseCase(fakeRepo, fakeMqtt)
  })

  test('envoie la commande MQTT avant de persister en base', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const callOrder: string[] = []

    const originalSendCommand = fakeMqtt.sendCommand.bind(fakeMqtt)
    fakeMqtt.sendCommand = async (dogId, command, missionId) => {
      callOrder.push('mqtt')
      return originalSendCommand(dogId, command, missionId)
    }

    const originalSave = fakeRepo.save.bind(fakeRepo)
    fakeRepo.save = async (d) => {
      callOrder.push('save')
      return originalSave(d)
    }

    await useCase.execute(dog.id.value, { type: RobotCommand.START_SESSION })

    assert.deepEqual(callOrder, ['mqtt', 'save'])
  })

  test('ne persiste pas en base si la publication MQTT échoue', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)
    fakeMqtt.shouldFail = true

    let saveCalled = false
    fakeRepo.save = async () => {
      saveCalled = true
    }

    await assert.rejects(() => useCase.execute(dog.id.value, { type: RobotCommand.START_SESSION }))

    assert.isFalse(saveCalled)
  })
})
```

- [ ] **Step 3: Vérifier que les tests échouent**

```bash
node ace test unit --files "tests/unit/robot-communication/**"
```

Attendu : FAIL — les deux tests échouent car l'ordre actuel est save→mqtt.

- [ ] **Step 4: Ajouter la garde connexion dans MqttServiceImplementation.sendCommand**

Dans `app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts`, remplacer la méthode `sendCommand` (lignes 56-63) :

```ts
async sendCommand(dogId: string, command: RobotCommand, missionId?: string): Promise<void> {
  if (!this.client?.connected) {
    throw new Error('MQTT client is not connected')
  }

  const topic = `robot/${dogId}/command`
  const payload: RobotCommandPayload = { type: command, missionId }

  await this.client.publishAsync(topic, JSON.stringify(payload), { qos: 1 })

  logger.info({ dogId, command }, 'MqttService: command sent')
}
```

- [ ] **Step 5: Inverser l'ordre publish/save dans SendRobotCommandUseCase**

Dans `app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts`, remplacer les lignes 43-44 :

```ts
// avant
await this.dogRepository.save(dog)
await this.communicationService.sendCommand(dogId, payload.type, payload.missionId)

// après
await this.communicationService.sendCommand(dogId, payload.type, payload.missionId)
await this.dogRepository.save(dog)
```

- [ ] **Step 6: Vérifier que les tests passent**

```bash
node ace test unit --files "tests/unit/robot-communication/**"
```

Attendu : PASS — 2 tests passent.

- [ ] **Step 7: Vérifier l'absence de régression**

```bash
node ace test unit
```

Attendu : même compte qu'avant + 2 nouveaux tests.

- [ ] **Step 8: Commit**

```bash
git add tests/unit/fakes/fake-robot-communication-service.ts \
        tests/unit/robot-communication/application/send-robot-command.spec.ts \
        app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts \
        app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts
git commit -m "fix: guard disconnected MQTT client and publish before DB save"
```

---

### Task 3 — Validation : missionId requis pour START_MISSION

**Files:**
- Create: `app/modules/robot-communication/domain/exceptions/invalid-robot-command.error.ts`
- Modify: `app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts` (ajout validation en début d'`execute`)
- Modify: `tests/unit/robot-communication/application/send-robot-command.spec.ts` (ajout de 2 tests)

**Interfaces:**
- Consumes: `FakeRobotCommunicationService` (Task 2), `FakeRobotDogRepository`
- Produces: `InvalidRobotCommandError` — exception exportée, utilisable par les controllers pour mapper en HTTP 422

- [ ] **Step 1: Créer l'exception domaine**

Créer `app/modules/robot-communication/domain/exceptions/invalid-robot-command.error.ts` :

```ts
export class InvalidRobotCommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRobotCommandError'
  }
}
```

- [ ] **Step 2: Écrire les tests qui vont échouer**

Dans `tests/unit/robot-communication/application/send-robot-command.spec.ts`, ajouter l'import en tête de fichier :

```ts
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
```

Puis ajouter un second groupe de tests dans le même fichier :

```ts
test.group('SendRobotCommandUseCase — validation', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let useCase: SendRobotCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    useCase = new SendRobotCommandUseCase(fakeRepo, fakeMqtt)
  })

  test('lève InvalidRobotCommandError pour START_MISSION sans missionId', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(
      () => useCase.execute(dog.id.value, { type: RobotCommand.START_MISSION }),
      InvalidRobotCommandError
    )

    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('accepte START_MISSION quand missionId est fourni', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute(dog.id.value, {
      type: RobotCommand.START_MISSION,
      missionId: '550e8400-e29b-41d4-a716-446655440000',
    })

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].missionId, '550e8400-e29b-41d4-a716-446655440000')
  })
})
```

- [ ] **Step 3: Vérifier que les nouveaux tests échouent**

```bash
node ace test unit --files "tests/unit/robot-communication/**"
```

Attendu : FAIL sur les 2 nouveaux tests (pas d'erreur levée, la commande part sans missionId).

- [ ] **Step 4: Ajouter la validation dans SendRobotCommandUseCase**

Dans `app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts`, ajouter l'import et la garde au début d'`execute()` :

```ts
// ajouter l'import en tête du fichier
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'

// dans execute(), AVANT le findById :
async execute(dogId: string, payload: RobotCommandPayload): Promise<void> {
  if (payload.type === RobotCommand.START_MISSION && !payload.missionId) {
    throw new InvalidRobotCommandError('missionId is required for START_MISSION command')
  }

  const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
  // ... reste inchangé
```

- [ ] **Step 5: Vérifier que tous les tests passent**

```bash
node ace test unit --files "tests/unit/robot-communication/**"
```

Attendu : PASS — 4 tests passent.

- [ ] **Step 6: Vérifier l'absence de régression**

```bash
node ace test unit
```

Attendu : même compte qu'avant + 4 nouveaux tests.

- [ ] **Step 7: Commit**

```bash
git add app/modules/robot-communication/domain/exceptions/invalid-robot-command.error.ts \
        app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts \
        tests/unit/robot-communication/application/send-robot-command.spec.ts
git commit -m "fix: require missionId for START_MISSION command"
```

---

### Task 4 — Corriger les step IDs hardcodés dans le simulateur

**Files:**
- Modify: `scripts/robot-simulator.ts`

**Interfaces:**
- Consumes: rien
- Produces: simulateur acceptant les vrais UUIDs de steps en 4e argument CLI

- [ ] **Step 1: Modifier le simulateur pour accepter les step IDs en argument**

Dans `scripts/robot-simulator.ts`, remplacer les lignes 14 et 58-64 :

```ts
// ajouter après la ligne 14 (après MISSION_ID)
const STEP_IDS_RAW = process.argv[4]

// remplacer le commentaire d'usage en tête de fichier
/**
 * Robot simulator — publishes MQTT messages to test the backend without hardware.
 *
 * Usage:
 *   npx tsx scripts/robot-simulator.ts <dogId> [missionId] [stepId1,stepId2,...]
 *
 * Example (UUIDs réels de la DB) :
 *   npx tsx scripts/robot-simulator.ts abc-123 def-456 uuid-step-1,uuid-step-2,uuid-step-3
 *
 * Sans step IDs, le simulateur utilise des noms fictifs ('step-1', etc.)
 * qui ne matchent pas la base — réservé aux tests de tuyauterie MQTT uniquement.
 */

// remplacer la ligne "const steps = ['step-1', 'step-2', 'step-3']"
const steps = STEP_IDS_RAW
  ? STEP_IDS_RAW.split(',').map((s) => s.trim())
  : ['step-1', 'step-2', 'step-3']
```

- [ ] **Step 2: Vérifier le typage TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add scripts/robot-simulator.ts
git commit -m "fix: accept real step UUIDs as CLI argument in robot simulator"
```
