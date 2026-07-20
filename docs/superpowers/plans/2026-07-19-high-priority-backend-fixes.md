# High-Priority Backend Fixes (H1, H2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two 🟠 "Élevé" (high-priority) backend findings from the 2026-07-18/19 audit: the user-search authorization bug that breaks robot sharing for non-admins (H1), and the "phantom mission" desync where a dog gets stuck `IN_MISSION` with no tracked run (H2).

**Architecture:** Both fixes are surgical changes inside the existing hexagonal layering — no new modules. H1 changes one line of policy logic (`UserPolicy.index`), relying on the controller's existing search-length guard for the real access rule. H2 extends `HandleRobotStateChangedUseCase` with a reconciliation branch that mirrors the "best-effort corrective STOP" pattern already established by `SweepStaleRobotRunsUseCase` (C2 fix).

**Tech Stack:** AdonisJS 7, TypeScript, Lucid, Bouncer policies, Japa test runner.

## Global Constraints

- Branch `fix/high-priority-backend`, created from `dev` (which already includes the merged C1/C2 critical fixes — verified via `git log`).
- Follow existing patterns exactly: `@inject()` DI via container, Japa `test.group`, fakes in `tests/unit/fakes/`.
- No new abstractions — reuse `RobotCommunicationService`, `RobotCommand.STOP_MISSION`, `FakeRobotCommunicationService` already introduced by the C2 fix.
- Run `npm run typecheck` and `node ace test` after each task; both must be clean of *new* failures (compare against the pre-existing baseline noted below if anything fails).
- Commit after each task (not each step) — one commit per audit finding, so the branch reads as one commit per H-number.

---

## Baseline check (run once, before Task 1)

- [ ] **Step 1: Record the pre-fix baseline**

```bash
node ace test 2>&1 | tail -20
npm run typecheck
```

Note any pre-existing failures (there is a stale record of 1 flaky infra test and a `notification.service.spec` typecheck issue from a prior session — confirm what's *actually* failing today, don't trust that note blindly). You'll compare against this after each task so you only flag *new* regressions.

---

### Task 1: H1 — `UserPolicy.index` blocks non-admin user search

**Files:**
- Modify: `app/modules/users/application/policies/user.policy.ts:18-20`
- Modify: `tests/functional/users/infrastructure/http/index-user-auth.spec.ts`
- Create: `tests/unit/users/policies/user.policy.spec.ts`

**Interfaces:**
- Consumes: `OwnershipReadRepository` (existing contract, already injected into `UserPolicy`), `FakeOwnershipRepository` from `#tests/unit/fakes/fake-ownership-repository`, `authenticateAs` helper from `#tests/functional/helpers/auth`.
- Produces: no new exports — `UserPolicy.index` keeps its existing signature `(user: User) => AuthorizerResponse`.

**Context:** `IndexUserController` (`app/modules/users/infrastructure/http/controllers/index.user.controller.ts:20-31`) already contains the correct business rule: admins get the full list, non-admins must supply a `search` of at least 3 characters (422 otherwise). But `bouncer.with('UserPolicy').authorize('index')` runs *before* that check, and `UserPolicy.index` is hardcoded to `user.role === UserRole.ADMIN`, so every non-admin gets a 403 before the controller's own guard ever runs. The fix is to stop gatekeeping at the policy layer and let the controller's existing logic be the real access rule — the policy only needs to confirm the caller is an authenticated user (already guaranteed by the auth middleware that populates `authenticatedUser`), not an admin.

- [ ] **Step 1: Write the failing functional test**

Add to `tests/functional/users/infrastructure/http/index-user-auth.spec.ts`, inside the existing `test.group('GET /api/v1/users auth', ...)`:

```ts
  test('should return 200 for a non-admin user with a valid search query', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client
      .get('/api/v1/users?search=ali')
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const body = response.body()
    assert.exists(body.data)
    assert.isArray(body.data)
  })
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
node ace test --tests="GET /api/v1/users auth"
```

Expected: FAIL — the new test gets `403` (Bouncer denial) instead of `200`.

- [ ] **Step 3: Write the failing unit test for the policy itself**

Create `tests/unit/users/policies/user.policy.spec.ts`:

```ts
import { test } from '@japa/runner'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import UserPolicy from '#users/application/policies/user.policy'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'

function makeUser(role: UserRole): User {
  return User.rehydrate('u1', 'fb-u1', 'u1@test.com', 'Test', 'User', role)
}

test.group('UserPolicy.index', () => {
  test('authorizes a non-admin user (search-only enforcement lives in the controller)', ({
    assert,
  }) => {
    const policy = new UserPolicy(new FakeOwnershipRepository())

    const result = policy.index(makeUser(UserRole.USER))

    assert.isTrue(result as boolean)
  })
})
```

- [ ] **Step 4: Run it to confirm it fails**

```bash
node ace test --tests="UserPolicy.index"
```

Expected: FAIL — `result` is `false`.

- [ ] **Step 5: Fix `UserPolicy.index`**

In `app/modules/users/application/policies/user.policy.ts`, replace:

```ts
  index(user: User): AuthorizerResponse {
    return user.role === UserRole.ADMIN
  }
```

with:

```ts
  index(_user: User): AuthorizerResponse {
    return true
  }
```

(`_user` is unused now — the admin/non-admin distinction is enforced by `IndexUserController`'s own search-length guard. `before()` still short-circuits admins to `true` first, so this only changes behavior for non-admins.)

- [ ] **Step 6: Run both new tests to confirm they pass**

```bash
node ace test --tests="UserPolicy.index"
node ace test --tests="GET /api/v1/users auth"
```

Expected: both PASS.

- [ ] **Step 7: Run the full backend suite and typecheck**

```bash
node ace test
npm run typecheck
```

Expected: no new failures vs. the baseline recorded above. In particular, `tests/unit/users/controllers/index.user.controller.spec.ts` must still pass unchanged (it stubs the bouncer, so it was never exercising this bug).

- [ ] **Step 8: Commit**

```bash
git add app/modules/users/application/policies/user.policy.ts \
        tests/functional/users/infrastructure/http/index-user-auth.spec.ts \
        tests/unit/users/policies/user.policy.spec.ts
git commit -m "fix(users): authorize non-admins to search users, fixing robot-sharing (H1)"
```

---

### Task 2: H2 — Phantom `IN_MISSION` state when no active run exists

**Files:**
- Modify: `app/modules/robot-communication/application/use-cases/handle-robot-state-changed.use-case.ts`
- Modify: `tests/unit/robot-communication/application/handle-robot-state-changed.spec.ts`

**Interfaces:**
- Consumes: `RobotCommunicationService.sendCommand(dogId: string, command: RobotCommand, data?: RobotCommandData): Promise<void>` (existing contract, `app/modules/robot-communication/domain/contracts/robot-communication.service.ts`), `RobotCommand.STOP_MISSION` (existing enum member, `app/modules/robot-communication/domain/types/robot-command.type.ts`), `FakeRobotCommunicationService` (existing test double, `tests/unit/fakes/fake-robot-communication-service.ts`, exposes `.calls[]` and `.shouldFail`).
- Produces: `HandleRobotStateChangedUseCase` constructor gains a 4th parameter `communicationService: RobotCommunicationService`. Resolved automatically via `@inject()` + `app.container.make(HandleRobotStateChangedUseCase)` in `mqtt.service.implementation.ts:139` — no call-site changes needed.

**Context:** `findActiveRunByRobotDog` only returns runs with status `PENDING` or `RUNNING` (see `ACTIVE_STATUSES` filter in `mission-run.repository.implementation.ts:52-60`). Today, when the robot publishes `IN_MISSION` and no such run exists (because the backend already abandoned/interrupted it via timeout, STOP, or the C2 sweep), the use case blindly sets the dog to `IN_MISSION` anyway (line 32-33 of the current file, unconditional) — the dog is now stuck `IN_MISSION` with nothing tracking it: step updates get ignored and a future STOP throws `NoActiveMissionRunError`. The fix mirrors the existing "best-effort corrective STOP" pattern from `SweepStaleRobotRunsUseCase.interrupt()` (C2): when this phantom case is detected, push the dog back to `IDLE` and best-effort ask the robot to stop, instead of trusting the robot's claimed state.

- [ ] **Step 1: Write the failing tests**

Replace the test `"ne touche pas au run ni à la queue si aucun run PENDING pour ce robot"` in `tests/unit/robot-communication/application/handle-robot-state-changed.spec.ts` and update the group setup. Full new file content:

```ts
import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { HandleRobotStateChangedUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-state-changed.use-case'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('HandleRobotStateChangedUseCase', (group) => {
  let dogRepo: FakeRobotDogRepository
  let runRepo: FakeMissionRunRepository
  let timeoutQueue: FakeMissionTimeoutQueue
  let communicationService: FakeRobotCommunicationService
  let useCase: HandleRobotStateChangedUseCase

  group.each.setup(() => {
    dogRepo = new FakeRobotDogRepository()
    runRepo = new FakeMissionRunRepository()
    timeoutQueue = new FakeMissionTimeoutQueue()
    communicationService = new FakeRobotCommunicationService()
    useCase = new HandleRobotStateChangedUseCase(dogRepo, runRepo, timeoutQueue, communicationService)
  })

  test('confirme le run PENDING et annule le job timeout quand robot publie IN_MISSION', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)
    assert.equal(run.status, MissionRunStatus.PENDING)

    await useCase.execute(dog.id.value, RobotDogState.IN_MISSION)

    const updated = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNotNull(updated)
    assert.equal(updated!.status, MissionRunStatus.RUNNING)

    assert.lengthOf(timeoutQueue.cancelled, 1)
    assert.equal(timeoutQueue.cancelled[0], run.id.value)
    assert.lengthOf(communicationService.calls, 0)
  })

  test('mission fantôme : renvoie le chien à IDLE et envoie un STOP correctif si IN_MISSION sans run actif', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, RobotDogState.IN_MISSION)

    const updatedDog = await dogRepo.findById(dog.id)
    assert.equal(updatedDog!.state, RobotDogState.IDLE)

    assert.lengthOf(timeoutQueue.cancelled, 0)
    assert.lengthOf(communicationService.calls, 1)
    assert.equal(communicationService.calls[0].dogId, dog.id.value)
    assert.equal(communicationService.calls[0].command, RobotCommand.STOP_MISSION)
  })

  test('mission fantôme : ne plante pas si le STOP correctif échoue (robot injoignable)', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)
    communicationService.shouldFail = true

    await useCase.execute(dog.id.value, RobotDogState.IN_MISSION)

    const updatedDog = await dogRepo.findById(dog.id)
    assert.equal(updatedDog!.state, RobotDogState.IDLE)
  })

  test("n'annule pas le job si l'état reçu n'est pas IN_MISSION", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)

    await useCase.execute(dog.id.value, RobotDogState.IDLE)

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.equal(found!.status, MissionRunStatus.PENDING)
    assert.lengthOf(timeoutQueue.cancelled, 0)
  })

  test('met à jour le state du dog', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, RobotDogState.OFFLINE)

    const updated = await dogRepo.findById(dog.id)
    assert.equal(updated!.state, RobotDogState.OFFLINE)
  })

  test('ignore un state inconnu sans planter', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, 'UNKNOWN_STATE')

    const unchanged = await dogRepo.findById(dog.id)
    assert.equal(unchanged!.state, RobotDogState.IDLE)
  })
})
```

- [ ] **Step 2: Run to confirm the new tests fail**

```bash
node ace test --tests="HandleRobotStateChangedUseCase"
```

Expected: FAIL — constructor arity mismatch (4 args passed, 3 expected) and/or the phantom-mission assertions failing (dog ends up `IN_MISSION`, `communicationService.calls` is empty).

- [ ] **Step 3: Implement the fix**

Replace the full content of `app/modules/robot-communication/application/use-cases/handle-robot-state-changed.use-case.ts`:

```ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

@inject()
export class HandleRobotStateChangedUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly missionTimeoutQueue: MissionTimeoutQueue,
    private readonly communicationService: RobotCommunicationService
  ) {}

  async execute(dogId: string, rawState: string): Promise<void> {
    const state = rawState as RobotDogState
    if (!Object.values(RobotDogState).includes(state)) {
      logger.warn({ dogId, rawState }, 'HandleRobotStateChanged: unknown state, ignoring')
      return
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      logger.warn({ dogId }, 'HandleRobotStateChanged: unknown robot, ignoring')
      return
    }

    if (state === RobotDogState.IN_MISSION) {
      const activeRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)

      if (!activeRun) {
        logger.warn(
          { dogId },
          'HandleRobotStateChanged: robot reports IN_MISSION without an active run (phantom mission), sending corrective STOP'
        )
        dog.applyStateFromRobot(RobotDogState.IDLE)
        await this.dogRepository.save(dog)
        void DogStateChangedEvent.dispatch(dogId, RobotDogState.IDLE)

        try {
          await this.communicationService.sendCommand(dogId, RobotCommand.STOP_MISSION)
        } catch (err) {
          logger.warn(
            { dogId, err },
            'HandleRobotStateChanged: corrective STOP failed (robot unreachable)'
          )
        }
        return
      }

      if (activeRun.status === MissionRunStatus.PENDING) {
        activeRun.confirm()
        await this.missionRunRepository.save(activeRun)
        await this.missionTimeoutQueue.cancel(activeRun.id.value)
      }
    }

    dog.applyStateFromRobot(state)
    await this.dogRepository.save(dog)
    void DogStateChangedEvent.dispatch(dogId, state)
  }
}
```

- [ ] **Step 4: Run to confirm all tests pass**

```bash
node ace test --tests="HandleRobotStateChangedUseCase"
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Run the full backend suite and typecheck**

```bash
node ace test
npm run typecheck
```

Expected: no new failures vs. baseline.

- [ ] **Step 6: Commit**

```bash
git add app/modules/robot-communication/application/use-cases/handle-robot-state-changed.use-case.ts \
        tests/unit/robot-communication/application/handle-robot-state-changed.spec.ts
git commit -m "fix(robot-communication): reconcile phantom IN_MISSION with corrective STOP (H2)"
```

---

## Self-Review Notes

- Spec coverage: H1 → Task 1, H2 → Task 2. All other audit findings (C1/C2 critical, H3-H7 frontend, all M/G items) are explicitly out of scope for this plan by user request.
- Both tasks touch only the files each finding names in the audit; no unrelated refactors.
- Type/signature consistency checked: `HandleRobotStateChangedUseCase` constructor signature (4 params) matches between the implementation and every test's `new HandleRobotStateChangedUseCase(...)` call.
