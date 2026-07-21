# RESTful Mission Command Routes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'endpoint command-bus générique (`POST /dogs/:id/commands`) par deux routes REST dédiées au cycle de vie d'une mission (`POST` / `DELETE /dogs/:id/mission`), et supprimer toute la couche de dispatch de commandes.

**Architecture:** Les use cases `StartMission`/`StopMission` renvoient désormais l'entité de domaine (`MissionRun` / `RobotDog`), que le contrôleur sérialise via un Transformer — exactement le pattern de `ShowMissionUseCase` du projet. Le `RobotCommandDispatcher`, l'interface `RobotCommandHandler`, le contrôleur générique et son validateur disparaissent ; chaque route pointe vers un contrôleur fin qui injecte directement son use case. Les use cases `StartSession`/`EndSession` sont conservés (sans route) pour un futur mode session ; `EmergencyStop` est supprimé.

**Tech Stack:** AdonisJS 6, TypeScript, Lucid ORM, Japa (tests), VineJS (validation), `@adonisjs/http-transformers`.

## Global Constraints

- Ne pas toucher au module `admin`/backoffice.
- Suivre les conventions du codebase : exports nommés/défaut selon le fichier voisin, suffixe `UseCase`/`Controller`/`Transformer`, `@inject()` d'AdonisJS pour la DI, entités renvoyées + Transformer pour la sérialisation HTTP (comme `ShowMissionUseCase`/`ShowMissionController`).
- Convention de policy : **une méthode par action de contrôleur** (ex. `show`, `assignToDog`, `removeFromDog`), corps `return this.ownershipRepository.isOwner(user.id, robotDogId)`.
- Le frontend ne consomme aucune de ces routes : **pas de rétrocompatibilité** à préserver.
- Suite de tests de référence : `node ace test unit`. Deux échecs sont **préexistants et hors scope** (`tests/unit/mission/application/show-mission.spec.ts` et `tests/unit/dogs/controllers/list-user-robot-dogs.controller.spec.ts`) — ils ne doivent ni être corrigés ici, ni servir de prétexte à un échec supplémentaire.
- `npx tsc --noEmit` a 2 erreurs de baseline dans `tests/unit/notifications/notification.service.spec.ts` (hors scope) ; aucune nouvelle erreur ne doit apparaître ailleurs.

---

## Task 1: Transformers `MissionRunStepTransformer` et `MissionRunTransformer`

**Files:**
- Create: `app/modules/missions/infrastructure/http/transformers/mission-run-step.transformer.ts`
- Create: `app/modules/missions/infrastructure/http/transformers/mission-run.transformer.ts`
- Create (test): `tests/unit/mission/infrastructure/mission-run.transformer.spec.ts`

**Interfaces:**
- Consumes : entités `MissionRun` (getters `id: MissionRunId`, `missionId: MissionId`, `robotDogId: RobotDogId`, `status: MissionRunStatus`, `startedAt: Date`, `endedAt: Date | null`, `runSteps: MissionRunStep[]`) et `MissionRunStep` (getters `id: MissionRunStepId`, `stepId: MissionStepId`, `status: MissionStepStatus`). Tous les value-objects d'ID exposent `.value: string`.
- Produces : `MissionRunTransformer` (export **default**) avec `toObject()` → `{ id, missionId, robotDogId, status, startedAt, endedAt, runSteps }`, où `runSteps` est un tableau d'objets plats `{ id, stepId, status }`. Consommé par la Task 2 (`StartMissionController`).

> Note de conception : `MissionRunTransformer.toObject()` mappe `runSteps` via `new MissionRunStepTransformer(s).toObject()` (tableau d'objets plats), plutôt que via `MissionRunStepTransformer.transform(...)`. C'est volontaire : `.transform()` renvoie un wrapper `Collection` non trivial à asserter en test, alors que le `.map(...toObject())` produit une valeur plate, testable directement, et se sérialise correctement via le helper `serialize()`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/unit/mission/infrastructure/mission-run.transformer.spec.ts` :

```ts
import { test } from '@japa/runner'
import MissionRunTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run.transformer'
import MissionRunStepTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run-step.transformer'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('MissionRunStepTransformer', () => {
  test('sérialise un run step en objet plat', ({ assert }) => {
    const step = MissionRunStep.create(MissionStepId.generate())

    const obj = new MissionRunStepTransformer(step).toObject()

    assert.equal(obj.id, step.id.value)
    assert.equal(obj.stepId, step.stepId.value)
    assert.equal(obj.status, step.status)
  })
})

test.group('MissionRunTransformer', () => {
  test('sérialise un run et ses steps', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [
      MissionStepId.generate(),
    ])

    const obj = new MissionRunTransformer(run).toObject()

    assert.equal(obj.id, run.id.value)
    assert.equal(obj.missionId, run.missionId.value)
    assert.equal(obj.robotDogId, run.robotDogId.value)
    assert.equal(obj.status, MissionRunStatus.RUNNING)
    assert.lengthOf(obj.runSteps, 1)
    assert.equal(obj.runSteps[0].stepId, run.runSteps[0].stepId.value)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node ace test unit --files="mission-run.transformer"`
Expected: FAIL — les fichiers `mission-run.transformer.ts` / `mission-run-step.transformer.ts` n'existent pas.

- [ ] **Step 3: Créer `MissionRunStepTransformer`**

Créer `app/modules/missions/infrastructure/http/transformers/mission-run-step.transformer.ts` :

```ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'

export default class MissionRunStepTransformer extends BaseTransformer<MissionRunStep> {
  toObject() {
    return {
      id: this.resource.id.value,
      stepId: this.resource.stepId.value,
      status: this.resource.status,
    }
  }
}
```

- [ ] **Step 4: Créer `MissionRunTransformer`**

Créer `app/modules/missions/infrastructure/http/transformers/mission-run.transformer.ts` :

```ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStepTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run-step.transformer'

export default class MissionRunTransformer extends BaseTransformer<MissionRun> {
  toObject() {
    return {
      id: this.resource.id.value,
      missionId: this.resource.missionId.value,
      robotDogId: this.resource.robotDogId.value,
      status: this.resource.status,
      startedAt: this.resource.startedAt,
      endedAt: this.resource.endedAt,
      runSteps: this.resource.runSteps.map((step) =>
        new MissionRunStepTransformer(step).toObject()
      ),
    }
  }
}
```

- [ ] **Step 5: Lancer le test pour vérifier le succès**

Run: `node ace test unit --files="mission-run.transformer"`
Expected: PASS (2 tests).

- [ ] **Step 6: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur (seules les 2 erreurs baseline de `notification.service.spec.ts`).

- [ ] **Step 7: Commit**

```bash
git add app/modules/missions/infrastructure/http/transformers/mission-run-step.transformer.ts app/modules/missions/infrastructure/http/transformers/mission-run.transformer.ts tests/unit/mission/infrastructure/mission-run.transformer.spec.ts
git commit -m "feat(missions): add MissionRun and MissionRunStep transformers"
```

---

## Task 2: Remplacer le command-bus par les routes REST mission

Cette tâche est **atomique** : la couche de commande est interdépendante (le contrôleur générique injecte le dispatcher, le dispatcher exige `implements RobotCommandHandler` sur les use cases, ce qui interdit de changer leur type de retour ; `routes.v1.ts` ne peut référencer que l'ancien ou le nouveau contrôleur). On la traite donc en une seule tâche, avec un unique commit final.

**Files:**
- Modify: `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts`
- Modify: `app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case.ts`
- Modify: `app/modules/robot-communication/application/use-cases/commands/start-session.use-case.ts`
- Modify: `app/modules/robot-communication/application/use-cases/commands/end-session.use-case.ts`
- Modify: `tests/unit/robot-communication/application/commands/start-mission.spec.ts`
- Modify: `tests/unit/robot-communication/application/commands/stop-mission.spec.ts`
- Modify: `app/modules/dogs/application/policies/robot-dog.policy.ts`
- Modify: `app/modules/robot-communication/infrastructure/http/routes.v1.ts`
- Create: `app/modules/robot-communication/infrastructure/http/validators/start-mission.validator.ts`
- Create: `app/modules/robot-communication/infrastructure/http/controllers/start-mission.controller.ts`
- Create: `app/modules/robot-communication/infrastructure/http/controllers/stop-mission.controller.ts`
- Delete: `app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case.ts`
- Delete: `tests/unit/robot-communication/application/robot-command-dispatcher.spec.ts`
- Delete: `app/modules/robot-communication/application/contracts/robot-command-handler.ts`
- Delete: `app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case.ts`
- Delete: `tests/unit/robot-communication/application/commands/emergency-stop.spec.ts`
- Delete: `app/modules/robot-communication/infrastructure/http/controllers/send-robot-command.controller.ts`
- Delete: `app/modules/robot-communication/infrastructure/http/validators/send-robot-command.validator.ts`

**Interfaces:**
- Consumes : `MissionRunTransformer` (Task 1), `RobotDogTransformer` (existant, `#dogs/infrastructure/http/transformers/robot-dog.transformer`, export **default**, prend un `RobotDog` nu), helper `serialize` (propriété de `HttpContext`, cf. `show-mission.controller.ts`).
- Produces :
  - `StartMissionCommandUseCase.execute(dogId: string, missionId?: string): Promise<MissionRun>`
  - `StopMissionCommandUseCase.execute(dogId: string): Promise<RobotDog>`
  - `RobotDogPolicy.startMission(user, robotDogId)` et `RobotDogPolicy.stopMission(user, robotDogId)`
  - Routes `POST /api/v1/dogs/:id/mission` et `DELETE /api/v1/dogs/:id/mission`.

- [ ] **Step 1: Mettre à jour le test de `StartMission` pour attendre le `MissionRun` retourné**

Dans `tests/unit/robot-communication/application/commands/start-mission.spec.ts`, dans le test `'démarre un run quand la mission est assignée au robot'`, remplacer le bloc d'assertions par une vérification de la valeur retournée. Remplacer :

```ts
    await useCase.execute(dog.id.value, mission.id.value)

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].missionId, mission.id.value)

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNotNull(run)
    assert.equal(run!.status, MissionRunStatus.RUNNING)
    assert.lengthOf(run!.runSteps, 1)
```

par :

```ts
    const returned = await useCase.execute(dog.id.value, mission.id.value)

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].missionId, mission.id.value)
    assert.equal(returned.status, MissionRunStatus.RUNNING)
    assert.lengthOf(returned.runSteps, 1)

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNotNull(run)
    assert.equal(run!.id.value, returned.id.value)
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `node ace test unit --files="start-mission"`
Expected: FAIL — `execute` renvoie `void`, donc `returned.status` ne compile pas / échoue.

- [ ] **Step 3: `StartMissionCommandUseCase` renvoie le `MissionRun`**

Dans `app/modules/robot-communication/application/use-cases/commands/start-mission.use-case.ts` :
1. Supprimer l'import `import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'`.
2. Retirer `implements RobotCommandHandler` de la déclaration de classe (garder `readonly command = RobotCommand.START_MISSION`).
3. Changer la signature et retourner le run.

La déclaration devient :

```ts
export class StartMissionCommandUseCase {
```

et la signature/fin de `execute` :

```ts
  async execute(dogId: string, missionId?: string): Promise<MissionRun> {
```

Puis, à la toute fin de la méthode (après `await this.dogRepository.save(dog)`), ajouter :

```ts
    return run
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `node ace test unit --files="start-mission"`
Expected: PASS (6 tests).

- [ ] **Step 5: Mettre à jour le test de `StopMission` pour attendre le `RobotDog` retourné**

Dans `tests/unit/robot-communication/application/commands/stop-mission.spec.ts`, dans le test `'interrompt le run actif du robot'`, remplacer :

```ts
    await useCase.execute(dog.id.value)

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNull(found)
    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].command, RobotCommand.STOP_MISSION)
```

par :

```ts
    const returned = await useCase.execute(dog.id.value)

    assert.equal(returned.id.value, dog.id.value)
    assert.equal(returned.state, RobotDogState.IDLE)

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNull(found)
    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].command, RobotCommand.STOP_MISSION)
```

Ajouter l'import en haut du fichier :

```ts
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
```

- [ ] **Step 6: Lancer le test pour vérifier l'échec**

Run: `node ace test unit --files="stop-mission"`
Expected: FAIL — `execute` renvoie `void`, `returned.state` ne compile pas / échoue.

- [ ] **Step 7: `StopMissionCommandUseCase` renvoie le `RobotDog`**

Dans `app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case.ts` :
1. Supprimer l'import `import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'`.
2. Retirer `implements RobotCommandHandler` (garder `readonly command`).
3. Ajouter l'import du type `RobotDog` en haut : `import { type RobotDog } from '#dogs/domain/robot-dog.entity'`.
4. Changer la signature et retourner le dog.

La déclaration devient :

```ts
export class StopMissionCommandUseCase {
```

la signature :

```ts
  async execute(dogId: string): Promise<RobotDog> {
```

et à la toute fin de la méthode (après `await this.dogRepository.save(dog)`) :

```ts
    return dog
```

- [ ] **Step 8: Lancer le test pour vérifier le succès**

Run: `node ace test unit --files="stop-mission"`
Expected: PASS (4 tests).

- [ ] **Step 9: Retirer `implements RobotCommandHandler` de `StartSession` et `EndSession`**

Dans `app/modules/robot-communication/application/use-cases/commands/start-session.use-case.ts` ET `.../end-session.use-case.ts` :
1. Supprimer la ligne d'import `import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'`.
2. Retirer `implements RobotCommandHandler` de la déclaration de classe (garder `readonly command` et le reste inchangé).

Les déclarations deviennent respectivement :

```ts
export class StartSessionCommandUseCase {
```
```ts
export class EndSessionCommandUseCase {
```

- [ ] **Step 10: Vérifier que les tests session restent verts**

Run: `node ace test unit --files="start-session" --files="end-session"`
Expected: PASS (8 tests).

- [ ] **Step 11: Supprimer `EmergencyStop`, le dispatcher, l'interface, le contrôleur générique et son validateur**

```bash
git rm app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case.ts \
       tests/unit/robot-communication/application/commands/emergency-stop.spec.ts \
       app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case.ts \
       tests/unit/robot-communication/application/robot-command-dispatcher.spec.ts \
       app/modules/robot-communication/application/contracts/robot-command-handler.ts \
       app/modules/robot-communication/infrastructure/http/controllers/send-robot-command.controller.ts \
       app/modules/robot-communication/infrastructure/http/validators/send-robot-command.validator.ts
```

- [ ] **Step 12: Renommer la policy `sendCommand` → `startMission` + `stopMission`**

Dans `app/modules/dogs/application/policies/robot-dog.policy.ts`, remplacer la méthode :

```ts
  async sendCommand(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }
```

par :

```ts
  async startMission(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }

  async stopMission(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }
```

- [ ] **Step 13: Créer le validateur `start-mission.validator.ts`**

Créer `app/modules/robot-communication/infrastructure/http/validators/start-mission.validator.ts` :

```ts
import vine from '@vinejs/vine'

export const startMissionValidator = vine.compile(
  vine.object({
    missionId: vine.string().uuid(),
  })
)
```

- [ ] **Step 14: Créer `StartMissionController`**

Créer `app/modules/robot-communication/infrastructure/http/controllers/start-mission.controller.ts` :

```ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { startMissionValidator } from '../validators/start-mission.validator.js'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import MissionRunTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class StartMissionController {
  constructor(private startMission: StartMissionCommandUseCase) {}

  public async handle({ request, params, response, bouncer, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('startMission', params.id)

    const payload = await request.validateUsing(startMissionValidator)

    const run = await this.startMission.execute(params.id, payload.missionId)

    response.status(201)
    return serialize(MissionRunTransformer.transform(run))
  }
}
```

- [ ] **Step 15: Créer `StopMissionController`**

Créer `app/modules/robot-communication/infrastructure/http/controllers/stop-mission.controller.ts` :

```ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import RobotDogTransformer from '#dogs/infrastructure/http/transformers/robot-dog.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class StopMissionController {
  constructor(private stopMission: StopMissionCommandUseCase) {}

  public async handle({ params, response, bouncer, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('stopMission', params.id)

    const dog = await this.stopMission.execute(params.id)

    response.status(200)
    return serialize(RobotDogTransformer.transform(dog))
  }
}
```

- [ ] **Step 16: Réécrire `routes.v1.ts`**

Remplacer intégralement le contenu de `app/modules/robot-communication/infrastructure/http/routes.v1.ts` par :

```ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const StartMissionController = () => import('./controllers/start-mission.controller.js')
const StopMissionController = () => import('./controllers/stop-mission.controller.js')

router
  .group(() => {
    router.post('/:id/mission', [StartMissionController])
    router.delete('/:id/mission', [StopMissionController])
  })
  .prefix('/api/v1/dogs')
  .use(middleware.firebaseAuth())
```

- [ ] **Step 17: Vérifier la compilation complète**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur (seules les 2 erreurs baseline de `notification.service.spec.ts`).

- [ ] **Step 18: Vérifier qu'aucune référence morte ne subsiste**

Run: `grep -rln "RobotCommandDispatcher\|RobotCommandHandler\|SendRobotCommandController\|EmergencyStopCommandUseCase\|async sendCommand\|authorize('sendCommand'" app tests --include="*.ts"`
Expected: aucune ligne (0 résultat).

> Note : on ne grep PAS `sendCommand` seul — c'est aussi le nom de la méthode du service MQTT (`communicationService.sendCommand(...)`), légitimement appelée par les use cases. On cible uniquement la méthode de policy supprimée (`async sendCommand`, `authorize('sendCommand'`) et les symboles du command-bus.

- [ ] **Step 19: Lancer la suite robot-communication + mission + dogs**

Run: `node ace test unit --files="robot-communication" --files="mission" --files="dogs"`
Expected: PASS, hors les 2 échecs préexistants documentés (`show-mission`, `list-user-robot-dogs.controller`).

- [ ] **Step 20: Commit**

```bash
git add -A app/modules/robot-communication app/modules/dogs/application/policies/robot-dog.policy.ts tests/unit/robot-communication
git commit -m "refactor(robot-communication): replace command-bus with RESTful mission routes"
```

---

## Task 3: Vérification finale complète

**Files:** aucun changement de code attendu ; tâche de garde.

- [ ] **Step 1: Suite unitaire complète**

Run: `node ace test unit`
Expected: PASS partout, sauf exactement les 2 échecs préexistants (`tests/unit/mission/application/show-mission.spec.ts`, `tests/unit/dogs/controllers/list-user-robot-dogs.controller.spec.ts`). Aucun nouvel échec.

- [ ] **Step 2: Compilation complète**

Run: `npx tsc --noEmit`
Expected: uniquement les 2 erreurs baseline de `tests/unit/notifications/notification.service.spec.ts`. Aucune autre.

- [ ] **Step 3: Vérifier l'absence de route `/commands` et la présence des routes mission**

Run: `grep -rn "commands\|/mission" app/modules/robot-communication/infrastructure/http/routes.v1.ts`
Expected: deux routes `/:id/mission` (POST et DELETE), aucune occurrence de `commands`.

---

## Self-Review

**Couverture du spec :**
- Routes REST mission (POST/DELETE) → Task 2 (Steps 14-16).
- Réponses mixtes (201 + MissionRun / 200 + RobotDog) → Task 2 (Steps 14-15), transformers en Task 1.
- Retour = entité + Transformer → Task 2 (Steps 3, 7) + Task 1.
- Suppression command-bus (dispatcher, interface, contrôleur générique, validateur, route `/commands`) → Task 2 (Step 11, 16).
- Session conservée non exposée (retrait de `implements` uniquement) → Task 2 (Step 9).
- Emergency-stop supprimé → Task 2 (Step 11).
- Renommage policy `sendCommand` → `startMission`/`stopMission` → Task 2 (Step 12).
- Vérifs finales (tsc, suite, grep) → Task 2 (Steps 17-19) + Task 3.

**Cohérence des types entre tâches :** `StartMissionCommandUseCase.execute(...): Promise<MissionRun>` (Task 2 Step 3) est consommé par `StartMissionController` (Step 14) qui passe le `MissionRun` à `MissionRunTransformer` (défini Task 1). `StopMissionCommandUseCase.execute(...): Promise<RobotDog>` (Step 7) → `StopMissionController` (Step 15) → `RobotDogTransformer`. Les méthodes de policy `startMission`/`stopMission` (Step 12) sont référencées par les contrôleurs (Steps 14-15).

**Note sur l'ordre intra-Task 2 :** entre les Steps 3 et 11, `npx tsc --noEmit` global serait rouge (le dispatcher encore présent référence des use cases qui n'implémentent plus l'interface). C'est attendu et sans impact : les Steps intermédiaires ne valident que des fichiers de test ciblés (`--files=...`), qui se compilent indépendamment ; la compilation globale n'est asseriée qu'au Step 17, après toutes les suppressions.
