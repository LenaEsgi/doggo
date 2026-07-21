# GET Active Mission Run Endpoint — Implementation Plan (Backend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exposer `GET /api/v1/dogs/:id/mission` renvoyant le `MissionRun` actif du robot (ou `null`), pour que le frontend puisse afficher l'état « mission en cours » au chargement (snapshot initial ; le live passe déjà par Transmit).

**Architecture:** Un use case fin `GetActiveMissionRunUseCase` interroge `MissionRunRepository.findActiveRunByRobotDog`. Un contrôleur HTTP autorise par ownership (`RobotDogPolicy.viewMission`) et sérialise via le `MissionRunTransformer` existant, ou renvoie `null` si aucun run. La route s'ajoute au groupe `/api/v1/dogs` de `robot-communication`, à côté de start/stop.

**Tech Stack:** AdonisJS 6, TypeScript, Lucid, Japa (tests unitaires), VineJS.

## Global Constraints

- Ne pas toucher au module `admin`/backoffice.
- Conventions : exports nommés/défaut selon le fichier voisin, suffixe `UseCase`/`Controller`, `@inject()` pour la DI, use case qui renvoie l'entité de domaine + Transformer pour la sérialisation, policy = une méthode par action (corps `return this.ownershipRepository.isOwner(user.id, robotDogId)`).
- Suite de référence : `node ace test unit`. Deux échecs sont **préexistants et hors scope** (`tests/unit/mission/application/show-mission.spec.ts`, `tests/unit/dogs/controllers/list-user-robot-dogs.controller.spec.ts`).
- `npx tsc --noEmit` a 2 erreurs baseline dans `tests/unit/notifications/notification.service.spec.ts` (hors scope) ; aucune nouvelle erreur ailleurs.
- Le contrôleur n'a pas de test HTTP fonctionnel (mock `bouncer` cassé dans le module dogs — hors scope) : la couverture passe par le test de use case, comme pour start/stop.

---

## Task 1: `GetActiveMissionRunUseCase`

**Files:**
- Create: `app/modules/robot-communication/application/use-cases/commands/get-active-mission-run.use-case.ts`
- Create (test): `tests/unit/robot-communication/application/commands/get-active-mission-run.spec.ts`

**Interfaces:**
- Consumes: `MissionRunRepository.findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null>` (existant), `FakeMissionRunRepository` (existant, `tests/unit/fakes/fake-mission-run-repository.ts`), `MissionRun.start(missionId, robotDogId, stepIds)` (existant).
- Produces: `GetActiveMissionRunUseCase.execute(dogId: string): Promise<MissionRun | null>`. Consommé par la Task 2 (contrôleur).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/unit/robot-communication/application/commands/get-active-mission-run.spec.ts` :

```ts
import { test } from '@japa/runner'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { GetActiveMissionRunUseCase } from '#app/modules/robot-communication/application/use-cases/commands/get-active-mission-run.use-case'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('GetActiveMissionRunUseCase', (group) => {
  let runRepo: FakeMissionRunRepository
  let useCase: GetActiveMissionRunUseCase

  group.each.setup(() => {
    runRepo = new FakeMissionRunRepository()
    useCase = new GetActiveMissionRunUseCase(runRepo)
  })

  test('retourne le run actif du robot', async ({ assert }) => {
    const dogId = RobotDogId.generate()
    const run = MissionRun.start(MissionId.generate(), dogId, [MissionStepId.generate()])
    await runRepo.save(run)

    const result = await useCase.execute(dogId.value)

    assert.isNotNull(result)
    assert.equal(result!.id.value, run.id.value)
  })

  test('retourne null si aucun run actif', async ({ assert }) => {
    const dogId = RobotDogId.generate()

    const result = await useCase.execute(dogId.value)

    assert.isNull(result)
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `node ace test unit --files="get-active-mission-run"`
Expected: FAIL — le fichier `get-active-mission-run.use-case.ts` n'existe pas encore.

- [ ] **Step 3: Implémenter le use case**

Créer `app/modules/robot-communication/application/use-cases/commands/get-active-mission-run.use-case.ts` :

```ts
import { inject } from '@adonisjs/core'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'

@inject()
export class GetActiveMissionRunUseCase {
  constructor(private readonly missionRunRepository: MissionRunRepository) {}

  async execute(dogId: string): Promise<MissionRun | null> {
    return this.missionRunRepository.findActiveRunByRobotDog(dogId)
  }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `node ace test unit --files="get-active-mission-run"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/modules/robot-communication/application/use-cases/commands/get-active-mission-run.use-case.ts tests/unit/robot-communication/application/commands/get-active-mission-run.spec.ts
git commit -m "feat(robot-communication): add GetActiveMissionRunUseCase"
```

---

## Task 2: Contrôleur + route + policy `viewMission`

**Files:**
- Modify: `app/modules/dogs/application/policies/robot-dog.policy.ts`
- Create: `app/modules/robot-communication/infrastructure/http/controllers/get-active-mission.controller.ts`
- Modify: `app/modules/robot-communication/infrastructure/http/routes.v1.ts`

**Interfaces:**
- Consumes: `GetActiveMissionRunUseCase` (Task 1), `MissionRunTransformer` (existant, `#app/modules/missions/infrastructure/http/transformers/mission-run.transformer`, export **default**), helper `serialize` (propriété de `HttpContext`), `RobotDogPolicy` (default import).
- Produces: `GET /api/v1/dogs/:id/mission` → `200` + `MissionRun` sérialisé, ou `200` + `null`. `RobotDogPolicy.viewMission(user, robotDogId)`.

- [ ] **Step 1: Ajouter la méthode de policy `viewMission`**

Dans `app/modules/dogs/application/policies/robot-dog.policy.ts`, ajouter après `stopMission` :

```ts
  async viewMission(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }
```

- [ ] **Step 2: Créer le contrôleur**

Créer `app/modules/robot-communication/infrastructure/http/controllers/get-active-mission.controller.ts` :

```ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { GetActiveMissionRunUseCase } from '#app/modules/robot-communication/application/use-cases/commands/get-active-mission-run.use-case'
import MissionRunTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class GetActiveMissionController {
  constructor(private getActiveMissionRun: GetActiveMissionRunUseCase) {}

  public async handle({ params, response, bouncer, logger, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('viewMission', params.id)

    logger.info({ robotDogId: params.id }, 'GetActiveMissionController called')

    const run = await this.getActiveMissionRun.execute(params.id)

    if (!run) {
      return response.ok(null)
    }

    return serialize(MissionRunTransformer.transform(run))
  }
}
```

- [ ] **Step 3: Ajouter la route**

Dans `app/modules/robot-communication/infrastructure/http/routes.v1.ts`, ajouter le lazy-import et la route `GET` dans le groupe existant :

```ts
const GetActiveMissionController = () => import('./controllers/get-active-mission.controller.js')
```

et, à l'intérieur du `router.group(() => { ... })`, avant `router.post('/:id/mission', ...)` :

```ts
    router.get('/:id/mission', [GetActiveMissionController])
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune nouvelle erreur (seules les 2 erreurs baseline de `notification.service.spec.ts`).

- [ ] **Step 5: Lancer la suite robot-communication**

Run: `node ace test unit --files="robot-communication"`
Expected: PASS (aucun échec).

- [ ] **Step 6: Commit**

```bash
git add app/modules/dogs/application/policies/robot-dog.policy.ts app/modules/robot-communication/infrastructure/http/controllers/get-active-mission.controller.ts app/modules/robot-communication/infrastructure/http/routes.v1.ts
git commit -m "feat(robot-communication): expose GET /dogs/:id/mission for active run snapshot"
```

---

## Task 3: Vérification finale

**Files:** aucun changement de code ; tâche de garde.

- [ ] **Step 1: Suite unitaire complète**

Run: `node ace test unit`
Expected: PASS partout sauf exactement les 2 échecs préexistants (`show-mission.spec`, `list-user-robot-dogs.controller.spec`). Aucun nouvel échec.

- [ ] **Step 2: Compilation**

Run: `npx tsc --noEmit`
Expected: uniquement les 2 erreurs baseline de `tests/unit/notifications/notification.service.spec.ts`.

- [ ] **Step 3: Vérifier les 3 routes mission**

Run: `grep -n "/:id/mission" app/modules/robot-communication/infrastructure/http/routes.v1.ts`
Expected: 3 lignes — `router.get`, `router.post`, `router.delete` sur `/:id/mission`.

---

## Self-Review

**Couverture spec (Partie A) :**
- `GET /dogs/:id/mission` → 200 + MissionRun | null → Tasks 1-2.
- Réutilise `findActiveRunByRobotDog` + `MissionRunTransformer` → Task 1 (use case), Task 2 (contrôleur).
- Policy `viewMission` (ownership) → Task 2 Step 1.
- Réponse `null` si aucun run → Task 2 Step 2 (`response.ok(null)`).

**Type consistency :** `GetActiveMissionRunUseCase.execute(dogId): Promise<MissionRun | null>` (Task 1) consommé à l'identique par `GetActiveMissionController` (Task 2), qui branche `serialize(MissionRunTransformer.transform(run))` pour le cas non-null.
