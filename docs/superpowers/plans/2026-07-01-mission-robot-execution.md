# Mission Robot Execution (MissionRun) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a mission be executed independently by several robots at once by introducing a `MissionRun`/`MissionRunStep` aggregate per (mission, robot) execution, removing the single global `Mission.status`/`MissionStep.status` that couldn't support N:N.

**Architecture:** `Mission` keeps only the shared step *definitions* (no status). A new `MissionRun` aggregate (with child `MissionRunStep` entities) tracks status and per-step progress for one specific (mission, robot) execution, with full history across repeated runs. Use cases that start/stop/report progress operate on `MissionRun`; use cases that edit mission steps consult `MissionRunRepository.hasActiveRunForMission` to block edits while any robot is executing.

**Tech Stack:** AdonisJS 6, Lucid ORM (PostgreSQL), Japa test runner (`node ace test`), MQTT (existing `robot-communication` module).

## Global Constraints

- No production data exists for `Mission.status` / `MissionStep.status` — drop columns directly, no migration/backfill needed.
- No new HTTP endpoint for run history in this plan (storage only, per approved spec).
- Follow existing module conventions exactly: DDD entities under `domain/`, `@inject()` use-cases under `application/usecases` (missions) or `application/use-cases` (robot-communication — note the existing hyphen difference between modules, keep each module's own convention), Lucid models/repositories under `infrastructure/`, abstract repository contracts under `domain/contracts/`, Japa tests under `tests/unit/...` mirroring the `app/` path.
- Every task must leave `node ace test` and `npx tsc --noEmit` green before moving to the next task.
- Full design reference: `docs/superpowers/specs/2026-07-01-mission-robot-execution-design.md`.

---

## Task 1: MissionRunStatus enum and new domain errors

**Files:**
- Create: `app/modules/missions/domain/enums/mission-run-status.ts`
- Create: `app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error.ts`
- Create: `app/modules/missions/domain/exceptions/no-active-mission-run.error.ts`
- Modify: `app/modules/missions/domain/exceptions/invalid-mission-not-editable.error.ts`
- Delete: `app/modules/missions/domain/exceptions/invalid-mission-not-running.error.ts` (only ever thrown by `Mission.endMission/interruptMission/complete/fail`, which Task 5 removes — safe to delete now since nothing else references it)
- Test: `tests/unit/mission/domain/invalid-mission-not-editable.spec.ts`

**Interfaces:**
- Produces: `MissionRunStatus` enum with values `RUNNING | SUCCESS | FAILED | INTERRUPTED`, consumed by Tasks 2-9.
- Produces: `MissionNotAssignedToRobotError`, `NoActiveMissionRunError` — both extend `DomainError` (`app/modules/share/exceptions/domain-error.ts`), consumed by Task 8.
- Produces: `InvalidMissionNotEditableError` with a **no-argument** constructor (was `constructor(status: MissionStatus)`), consumed by Task 5.

- [ ] **Step 1: Write the failing test for the simplified error**

```typescript
// tests/unit/mission/domain/invalid-mission-not-editable.spec.ts
import { test } from '@japa/runner'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'

test.group('InvalidMissionNotEditableError', () => {
  test('builds without a status argument', ({ assert }) => {
    const error = new InvalidMissionNotEditableError()
    assert.equal(error.name, 'MissionNotEditableError')
    assert.equal(error.message, 'Mission cannot be modified while a run is active on at least one robot')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/mission/domain/invalid-mission-not-editable.spec.ts`
Expected: FAIL — compile error, current constructor requires a `MissionStatus` argument.

- [ ] **Step 3: Create `MissionRunStatus` enum**

```typescript
// app/modules/missions/domain/enums/mission-run-status.ts
export enum MissionRunStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  INTERRUPTED = 'INTERRUPTED',
}
```

- [ ] **Step 4: Create the two new domain errors**

```typescript
// app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionNotAssignedToRobotError extends DomainError {
  constructor(missionId: string, robotDogId: string) {
    super(`Mission ${missionId} is not assigned to robot dog ${robotDogId}`)
    this.name = 'MissionNotAssignedToRobotError'
  }
}
```

```typescript
// app/modules/missions/domain/exceptions/no-active-mission-run.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class NoActiveMissionRunError extends DomainError {
  constructor(robotDogId: string) {
    super(`Robot dog ${robotDogId} has no active mission run`)
    this.name = 'NoActiveMissionRunError'
  }
}
```

- [ ] **Step 5: Simplify `InvalidMissionNotEditableError` and delete the dead "not running" error**

```typescript
// app/modules/missions/domain/exceptions/invalid-mission-not-editable.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionNotEditableError extends DomainError {
  constructor() {
    super('Mission cannot be modified while a run is active on at least one robot')
    this.name = 'MissionNotEditableError'
  }
}
```

Delete `app/modules/missions/domain/exceptions/invalid-mission-not-running.error.ts`.

- [ ] **Step 6: Run test to verify it passes**

Run: `node ace test tests/unit/mission/domain/invalid-mission-not-editable.spec.ts`
Expected: PASS

- [ ] **Step 7: Full test suite + typecheck**

Run: `node ace test && npx tsc --noEmit`
Expected: FAIL on `tests/unit/mission/domain/mission.spec.ts` and `mission.entity.ts` (they still reference the old constructor/`InvalidMissionNotRunningError`) — this is expected and fixed in Task 5. Confirm the only failures are in those two files before continuing.

- [ ] **Step 8: Commit**

```bash
git add app/modules/missions/domain/enums/mission-run-status.ts app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error.ts app/modules/missions/domain/exceptions/no-active-mission-run.error.ts app/modules/missions/domain/exceptions/invalid-mission-not-editable.error.ts tests/unit/mission/domain/invalid-mission-not-editable.spec.ts
git rm app/modules/missions/domain/exceptions/invalid-mission-not-running.error.ts
git commit -m "feat(missions): add MissionRunStatus enum and run-related domain errors"
```

---

## Task 2: MissionRunId and MissionRunStepId value objects

**Files:**
- Create: `app/modules/missions/domain/value-objects/mission-run-id.ts`
- Create: `app/modules/missions/domain/value-objects/mission-run-step-id.ts`
- Create: `app/modules/missions/domain/exceptions/invalid-mission-run-id.error.ts`
- Create: `app/modules/missions/domain/exceptions/invalid-mission-run-step-id.error.ts`
- Test: `tests/unit/mission/domain/mission-run-id.spec.ts`

**Interfaces:**
- Consumes: `UniqueEntityId` (`app/modules/share/entities/unique-entity-id.ts`) — same base class as `MissionId`/`MissionStepId`.
- Produces: `MissionRunId.generate()`, `MissionRunId.fromString(value: string)`, `MissionRunStepId.generate()`, `MissionRunStepId.fromString(value: string)`. Consumed by Tasks 3-4 and the repository in Task 6.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/domain/mission-run-id.spec.ts
import { test } from '@japa/runner'
import { MissionRunId } from '#app/modules/missions/domain/value-objects/mission-run-id'
import { InvalidMissionRunIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-run-id.error'

test.group('MissionRunId', () => {
  test('generates a valid id', ({ assert }) => {
    const id = MissionRunId.generate()
    assert.isString(id.value)
  })

  test('rejects an invalid uuid', ({ assert }) => {
    assert.throws(() => MissionRunId.fromString('not-a-uuid'), InvalidMissionRunIdError)
  })

  test('two ids with the same value are equal', ({ assert }) => {
    const id = MissionRunId.generate()
    assert.isTrue(id.equals(MissionRunId.fromString(id.value)))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/mission/domain/mission-run-id.spec.ts`
Expected: FAIL with "Cannot find module '#app/modules/missions/domain/value-objects/mission-run-id'"

- [ ] **Step 3: Implement the value objects and their errors**

```typescript
// app/modules/missions/domain/exceptions/invalid-mission-run-id.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionRunIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionRunId: ${value}`)
  }
}
```

```typescript
// app/modules/missions/domain/exceptions/invalid-mission-run-step-id.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionRunStepIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionRunStepId: ${value}`)
  }
}
```

```typescript
// app/modules/missions/domain/value-objects/mission-run-id.ts
import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionRunIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-run-id.error'

export class MissionRunId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionRunId {
    return new MissionRunId(this.generateUuid())
  }

  public static fromString(value: string): MissionRunId {
    try {
      this.validate(value)
      return new MissionRunId(value)
    } catch {
      throw new InvalidMissionRunIdError(value)
    }
  }
}
```

```typescript
// app/modules/missions/domain/value-objects/mission-run-step-id.ts
import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionRunStepIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-run-step-id.error'

export class MissionRunStepId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionRunStepId {
    return new MissionRunStepId(this.generateUuid())
  }

  public static fromString(value: string): MissionRunStepId {
    try {
      this.validate(value)
      return new MissionRunStepId(value)
    } catch {
      throw new InvalidMissionRunStepIdError(value)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test tests/unit/mission/domain/mission-run-id.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/domain/value-objects/mission-run-id.ts app/modules/missions/domain/value-objects/mission-run-step-id.ts app/modules/missions/domain/exceptions/invalid-mission-run-id.error.ts app/modules/missions/domain/exceptions/invalid-mission-run-step-id.error.ts tests/unit/mission/domain/mission-run-id.spec.ts
git commit -m "feat(missions): add MissionRunId and MissionRunStepId value objects"
```

---

## Task 3: MissionRunStep child entity

**Files:**
- Create: `app/modules/missions/domain/entities/mission-run-step.entity.ts`
- Test: `tests/unit/mission/domain/mission-run-step.spec.ts`

**Interfaces:**
- Consumes: `MissionRunStepId` (Task 2), `MissionStepId` (existing, `app/modules/missions/domain/value-objects/mission-step-id.ts`), `MissionStepStatus` enum (existing, `app/modules/missions/domain/enums/mission-step-status.ts`), `InvalidMissionStepTransitionError` (existing).
- Produces: `MissionRunStep.create(stepId: MissionStepId): MissionRunStep`, `MissionRunStep.rehydrate(id: string, stepId: string, status: MissionStepStatus): MissionRunStep`, instance methods `complete(): void`, `fail(): void`, getters `id`, `stepId`, `status`. Consumed by Task 4 (`MissionRun`) and Task 6 (repository mapping).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/domain/mission-run-step.spec.ts
import { test } from '@japa/runner'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { InvalidMissionStepTransitionError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-transition-error'

test.group('MissionRunStep entity', () => {
  test('creates a run step as PENDING', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const runStep = MissionRunStep.create(stepId)

    assert.isTrue(runStep.stepId.equals(stepId))
    assert.equal(runStep.status, MissionStepStatus.PENDING)
  })

  test('completes a pending run step', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate())
    runStep.complete()
    assert.equal(runStep.status, MissionStepStatus.COMPLETED)
  })

  test('fails a pending run step', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate())
    runStep.fail()
    assert.equal(runStep.status, MissionStepStatus.FAILED)
  })

  test('cannot complete a step that is not pending', ({ assert }) => {
    const runStep = MissionRunStep.create(MissionStepId.generate())
    runStep.complete()
    assert.throws(() => runStep.complete(), InvalidMissionStepTransitionError)
  })

  test('rehydrates from stored values', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const runStep = MissionRunStep.create(stepId)

    const rehydrated = MissionRunStep.rehydrate(runStep.id.value, stepId.value, MissionStepStatus.COMPLETED)

    assert.isTrue(rehydrated.id.equals(runStep.id))
    assert.equal(rehydrated.status, MissionStepStatus.COMPLETED)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/mission/domain/mission-run-step.spec.ts`
Expected: FAIL with "Cannot find module '#app/modules/missions/domain/entities/mission-run-step.entity'"

- [ ] **Step 3: Implement `MissionRunStep`**

```typescript
// app/modules/missions/domain/entities/mission-run-step.entity.ts
import { MissionRunStepId } from '#app/modules/missions/domain/value-objects/mission-run-step-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { InvalidMissionStepTransitionError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-transition-error'

export default class MissionRunStep {
  private constructor(
    private readonly _id: MissionRunStepId,
    private readonly _stepId: MissionStepId,
    private _status: MissionStepStatus
  ) {}

  static create(stepId: MissionStepId): MissionRunStep {
    return new MissionRunStep(MissionRunStepId.generate(), stepId, MissionStepStatus.PENDING)
  }

  static rehydrate(id: string, stepId: string, status: MissionStepStatus): MissionRunStep {
    return new MissionRunStep(
      MissionRunStepId.fromString(id),
      MissionStepId.fromString(stepId),
      status
    )
  }

  complete(): void {
    if (this._status !== MissionStepStatus.PENDING) {
      throw new InvalidMissionStepTransitionError()
    }
    this._status = MissionStepStatus.COMPLETED
  }

  fail(): void {
    if (this._status !== MissionStepStatus.PENDING) {
      throw new InvalidMissionStepTransitionError()
    }
    this._status = MissionStepStatus.FAILED
  }

  get id(): MissionRunStepId {
    return this._id
  }

  get stepId(): MissionStepId {
    return this._stepId
  }

  get status(): MissionStepStatus {
    return this._status
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test tests/unit/mission/domain/mission-run-step.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/domain/entities/mission-run-step.entity.ts tests/unit/mission/domain/mission-run-step.spec.ts
git commit -m "feat(missions): add MissionRunStep entity"
```

---

## Task 4: MissionRun aggregate root

**Files:**
- Create: `app/modules/missions/domain/entities/mission-run.entity.ts`
- Test: `tests/unit/mission/domain/mission-run.spec.ts`

**Interfaces:**
- Consumes: `MissionRunId` (Task 2), `MissionRunStep` (Task 3), `MissionId` (existing), `RobotDogId` (existing, `app/modules/dogs/domain/value-objects/robot-dog-id.ts`), `MissionStepId` (existing), `MissionStepStatus` (existing), `MissionRunStatus` (Task 1), `NoActiveMissionRunError` (Task 1), `InvalidMissionStepNotFoundError` (existing, `app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error.ts`).
- Produces: `MissionRun.start(missionId: MissionId, robotDogId: RobotDogId, stepIds: MissionStepId[]): MissionRun`, `MissionRun.rehydrate(id, missionId, robotDogId, status, runSteps, startedAt, endedAt): MissionRun`, `completeStep(stepId: MissionStepId): void`, `failStep(stepId: MissionStepId): void`, `interrupt(): void`, getters `id`, `missionId`, `robotDogId`, `status`, `runSteps`, `startedAt`, `endedAt`, `isTerminal: boolean`. Consumed by Task 6 (repository), Task 8 (`SendRobotCommandUseCase`), Task 9 (`HandleRobotMissionUpdateUseCase`).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/domain/mission-run.spec.ts
import { test } from '@japa/runner'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'

test.group('MissionRun entity', () => {
  test('starts RUNNING with one PENDING run step per given step id', ({ assert }) => {
    const stepId1 = MissionStepId.generate()
    const stepId2 = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId1, stepId2])

    assert.equal(run.status, MissionRunStatus.RUNNING)
    assert.lengthOf(run.runSteps, 2)
    assert.isNull(run.endedAt)
    assert.isFalse(run.isTerminal)
  })

  test('completing all steps makes the run SUCCESS', ({ assert }) => {
    const stepId1 = MissionStepId.generate()
    const stepId2 = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId1, stepId2])

    run.completeStep(stepId1)
    assert.equal(run.status, MissionRunStatus.RUNNING)

    run.completeStep(stepId2)
    assert.equal(run.status, MissionRunStatus.SUCCESS)
    assert.isTrue(run.isTerminal)
    assert.isNotNull(run.endedAt)
  })

  test('failing one step makes the run FAILED even if others are pending', ({ assert }) => {
    const stepId1 = MissionStepId.generate()
    const stepId2 = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId1, stepId2])

    run.failStep(stepId1)

    assert.equal(run.status, MissionRunStatus.FAILED)
    assert.isTrue(run.isTerminal)
  })

  test('throws when completing an unknown step', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [MissionStepId.generate()])

    assert.throws(() => run.completeStep(MissionStepId.generate()), InvalidMissionStepNotFoundError)
  })

  test('interrupt() moves a running run to INTERRUPTED', ({ assert }) => {
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [MissionStepId.generate()])

    run.interrupt()

    assert.equal(run.status, MissionRunStatus.INTERRUPTED)
    assert.isTrue(run.isTerminal)
  })

  test('cannot interrupt a run that is already terminal', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId])
    run.completeStep(stepId)

    assert.throws(() => run.interrupt(), NoActiveMissionRunError)
  })

  test('cannot report progress on a run that is already terminal', ({ assert }) => {
    const stepId = MissionStepId.generate()
    const run = MissionRun.start(MissionId.generate(), RobotDogId.generate(), [stepId])
    run.completeStep(stepId)

    assert.throws(() => run.failStep(stepId), NoActiveMissionRunError)
  })

  test('rehydrates from stored values', ({ assert }) => {
    const missionId = MissionId.generate()
    const robotDogId = RobotDogId.generate()
    const run = MissionRun.start(missionId, robotDogId, [MissionStepId.generate()])

    const rehydrated = MissionRun.rehydrate(
      run.id.value,
      missionId.value,
      robotDogId.value,
      MissionRunStatus.RUNNING,
      run.runSteps,
      run.startedAt,
      null
    )

    assert.isTrue(rehydrated.id.equals(run.id))
    assert.equal(rehydrated.status, MissionRunStatus.RUNNING)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/mission/domain/mission-run.spec.ts`
Expected: FAIL with "Cannot find module '#app/modules/missions/domain/entities/mission-run.entity'"

- [ ] **Step 3: Implement `MissionRun`**

```typescript
// app/modules/missions/domain/entities/mission-run.entity.ts
import { MissionRunId } from '#app/modules/missions/domain/value-objects/mission-run-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'

export default class MissionRun {
  private constructor(
    private readonly _id: MissionRunId,
    private readonly _missionId: MissionId,
    private readonly _robotDogId: RobotDogId,
    private _status: MissionRunStatus,
    private readonly _runSteps: MissionRunStep[],
    private readonly _startedAt: Date,
    private _endedAt: Date | null
  ) {}

  static start(missionId: MissionId, robotDogId: RobotDogId, stepIds: MissionStepId[]): MissionRun {
    return new MissionRun(
      MissionRunId.generate(),
      missionId,
      robotDogId,
      MissionRunStatus.RUNNING,
      stepIds.map((stepId) => MissionRunStep.create(stepId)),
      new Date(),
      null
    )
  }

  static rehydrate(
    id: string,
    missionId: string,
    robotDogId: string,
    status: MissionRunStatus,
    runSteps: MissionRunStep[],
    startedAt: Date,
    endedAt: Date | null
  ): MissionRun {
    return new MissionRun(
      MissionRunId.fromString(id),
      MissionId.fromString(missionId),
      RobotDogId.fromString(robotDogId),
      status,
      runSteps,
      startedAt,
      endedAt
    )
  }

  completeStep(stepId: MissionStepId): void {
    this.ensureRunning()
    this.findRunStep(stepId).complete()
    this.recomputeStatus()
  }

  failStep(stepId: MissionStepId): void {
    this.ensureRunning()
    this.findRunStep(stepId).fail()
    this.recomputeStatus()
  }

  interrupt(): void {
    this.ensureRunning()
    this._status = MissionRunStatus.INTERRUPTED
    this._endedAt = new Date()
  }

  private recomputeStatus(): void {
    const allCompleted = this._runSteps.every((s) => s.status === MissionStepStatus.COMPLETED)
    const anyFailed = this._runSteps.some((s) => s.status === MissionStepStatus.FAILED)

    if (allCompleted) {
      this._status = MissionRunStatus.SUCCESS
      this._endedAt = new Date()
    } else if (anyFailed) {
      this._status = MissionRunStatus.FAILED
      this._endedAt = new Date()
    }
  }

  private findRunStep(stepId: MissionStepId): MissionRunStep {
    const runStep = this._runSteps.find((s) => s.stepId.equals(stepId))
    if (!runStep) {
      throw new InvalidMissionStepNotFoundError(stepId)
    }
    return runStep
  }

  private ensureRunning(): void {
    if (this._status !== MissionRunStatus.RUNNING) {
      throw new NoActiveMissionRunError(this._robotDogId.value)
    }
  }

  get id(): MissionRunId {
    return this._id
  }

  get missionId(): MissionId {
    return this._missionId
  }

  get robotDogId(): RobotDogId {
    return this._robotDogId
  }

  get status(): MissionRunStatus {
    return this._status
  }

  get runSteps(): MissionRunStep[] {
    return this._runSteps
  }

  get startedAt(): Date {
    return this._startedAt
  }

  get endedAt(): Date | null {
    return this._endedAt
  }

  get isTerminal(): boolean {
    return this._status !== MissionRunStatus.RUNNING
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test tests/unit/mission/domain/mission-run.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/domain/entities/mission-run.entity.ts tests/unit/mission/domain/mission-run.spec.ts
git commit -m "feat(missions): add MissionRun aggregate root"
```

---

## Task 5: Remove `status` from `Mission` and `MissionStep`

This is the biggest task: `Mission.status`/`MissionStep.status` are being replaced by `MissionRun`/`MissionRunStep` (Tasks 3-4). Every file that reads either field must change together or the build won't compile — so this task touches domain, infra, and tests in one pass. `MissionStatus` enum itself is left in place (still used by `mission-completed.event.ts`, `mission-step-updated.event.ts`, `mission-completed-sse.listener.ts`, `handle-robot-mission-update.use-case.ts` until Task 9 migrates them) — do not delete it here.

**Files:**
- Modify: `app/modules/missions/domain/entities/mission.entity.ts`
- Modify: `app/modules/missions/domain/entities/mission-step.entity.ts`
- Modify: `app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts`
- Modify: `app/modules/missions/infrastructure/database/models/mission.ts`
- Modify: `app/modules/missions/infrastructure/database/models/mission-step.ts`
- Modify: `app/modules/missions/infrastructure/http/transformers/mission.transformer.ts`
- Modify: `app/modules/missions/infrastructure/http/transformers/mission-step.transformer.ts`
- Modify: `tests/unit/mission/domain/mission.spec.ts`
- Create migration (via `node ace make:migration drop_status_from_missions_table`): drops `missions.status`
- Create migration (via `node ace make:migration drop_status_from_mission_steps_table`): drops `mission_steps.status`

**Interfaces:**
- Produces: `Mission.addStep(actionId, parameters, hasActiveRun = false)`, `removeStep(id, hasActiveRun = false)`, `moveStep(stepId, newOrder, hasActiveRun = false)`, `syncSteps(desired, hasActiveRun = false)` — the new `hasActiveRun` parameter defaults to `false` so every existing call site that doesn't care about run-locking keeps compiling; only call sites that need to enforce the lock (Task 7) pass `true`. `Mission.rehydrate` and `Mission.create` no longer take/return a status. `MissionStep.create`/`rehydrate` no longer take a status.
- Consumed by: Task 7 (use-cases pass the real `hasActiveRun`), Task 6 (repository/migrations), all mission use-case tests.

- [ ] **Step 1: Update `mission.spec.ts` to drop status-based tests and adapt remaining ones**

Remove these tests entirely (the behavior they cover no longer exists on `Mission`): `'should create a mission with default status'` (replace with a status-free assertion below), `'should start mission'`, `'should not start already running mission'`, `'should end mission'`, `'should not end mission not running'`, `'should interrupt mission'`, `'should not interrupt mission not running'`. Remove the `MissionStatus`, `InvalidMissionAlreadyRunningError`, `InvalidMissionNotRunningError` imports (no longer used in this file).

Replace the first test and the editability test:

```typescript
  test('should create a mission', ({ assert }) => {
    const mission = Mission.create('Test Mission', 'user-1')
    assert.equal(mission.name, 'Test Mission')
    assert.equal(mission.userId, 'user-1')
    assert.lengthOf(mission.missionSteps, 0)
  })
```

```typescript
  test('should not allow editing while a run is active', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    assert.throws(() => mission.addStep('action', 'params', true), InvalidMissionNotEditableError)
  })

  test('should allow editing when no run is active', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')
    mission.addStep('action', 'params', false)
    assert.lengthOf(mission.missionSteps, 1)
  })
```

The last `syncSteps` test (`'syncSteps throws InvalidMissionNotEditableError if not STAND_BY'`) becomes:

```typescript
  test('syncSteps throws InvalidMissionNotEditableError when a run is active', ({ assert }) => {
    const mission = Mission.create('Test', 'user-1')

    assert.throws(
      () => mission.syncSteps([{ actionId: 'action-1', parameters: '' }], true),
      InvalidMissionNotEditableError
    )
  })
```

All other tests (`rename`, `addStep`, `removeStep`, `moveStep`, `syncSteps` happy paths) are unaffected since `hasActiveRun` defaults to `false`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/mission/domain/mission.spec.ts`
Expected: FAIL — `Mission.addStep`/`syncSteps` don't accept a second/third argument yet, `mission.status` doesn't exist as asserted, imports of now-removed test names are gone but entity hasn't changed.

- [ ] **Step 3: Simplify `Mission` entity**

Replace the whole file:

```typescript
// app/modules/missions/domain/entities/mission.entity.ts
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'
import { type RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { MissionNameCannotBeEmptyError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-cannot-be-empty.error'
import { MissionNameTooLongError } from '#app/modules/missions/domain/exceptions/invalid-mission-name-too-long.error'

export default class Mission {
  private static MAX_NAME_LENGTH = 100

  private constructor(
    private _id: MissionId,
    private _name: string,
    private _robotDogIds: RobotDogId[],
    private _userId: string,
    private _missionSteps: MissionStep[]
  ) {}

  public static create(name: string, userId: string) {
    return new Mission(MissionId.generate(), name, [], userId, [])
  }

  public static rehydrate(
    id: string,
    name: string,
    userId: string,
    missionSteps: MissionStep[] = [],
    robotDogIds?: RobotDogId[]
  ) {
    return new Mission(MissionId.fromString(id), name, robotDogIds ?? [], userId, missionSteps)
  }

  // -------------------
  // Business
  // -------------------

  rename(newName: string) {
    if (!newName || !newName.trim()) {
      throw new MissionNameCannotBeEmptyError()
    }

    if (newName.length > Mission.MAX_NAME_LENGTH) {
      throw new MissionNameTooLongError(Mission.MAX_NAME_LENGTH)
    }

    this._name = newName.trim()
  }

  public addStep(actionId: string, parameters: string, hasActiveRun: boolean = false): void {
    this.ensureEditable(hasActiveRun)

    const nextOrder = this._missionSteps.length + 1
    const step = MissionStep.create(actionId, nextOrder, parameters)

    this._missionSteps.push(step)
  }

  public removeStep(id: MissionStepId, hasActiveRun: boolean = false): void {
    this.ensureEditable(hasActiveRun)

    const index = this._missionSteps.findIndex((s) => s.id.equals(id))

    if (index === -1) {
      throw new InvalidMissionStepNotFoundError(id)
    }

    this._missionSteps.splice(index, 1)
    this.reorderSteps()
  }

  public moveStep(stepId: MissionStepId, newOrder: number, hasActiveRun: boolean = false): void {
    this.ensureEditable(hasActiveRun)

    const stepToMove = this._missionSteps.find((s) => s.id.equals(stepId))
    if (!stepToMove) {
      throw new InvalidMissionStepNotFoundError(stepId)
    }

    const maxOrder = this._missionSteps.length
    if (newOrder <= 0 || newOrder > maxOrder) {
      throw new InvalidMissionStepOrderError(newOrder)
    }

    const oldOrder = stepToMove.order

    if (newOrder === oldOrder) return

    if (newOrder < oldOrder) {
      this._missionSteps.forEach((s) => {
        if (s.order >= newOrder && s.order < oldOrder) {
          s.changeOrder(s.order + 1)
        }
      })
    }

    if (newOrder > oldOrder) {
      this._missionSteps.forEach((s) => {
        if (s.order <= newOrder && s.order > oldOrder) {
          s.changeOrder(s.order - 1)
        }
      })
    }
    stepToMove.changeOrder(newOrder)
  }

  public syncSteps(
    desired: Array<{ id?: string; actionId: string; parameters: string }>,
    hasActiveRun: boolean = false
  ): void {
    this.ensureEditable(hasActiveRun)

    const newSteps: MissionStep[] = desired.map((item, index) => {
      const order = index + 1

      if (item.id) {
        const existing = this._missionSteps.find((s) => s.id.value === item.id)
        if (!existing) {
          throw new InvalidMissionStepNotFoundError(MissionStepId.fromString(item.id))
        }
        existing.changeOrder(order)
        return existing
      }

      return MissionStep.create(item.actionId, order, item.parameters)
    })

    this._missionSteps = newSteps
  }

  public getStepsInOrder(): MissionStep[] {
    return [...this._missionSteps].sort((a, b) => a.order - b.order)
  }

  private ensureEditable(hasActiveRun: boolean): void {
    if (hasActiveRun) {
      throw new InvalidMissionNotEditableError()
    }
  }

  private reorderSteps(): void {
    this._missionSteps
      .sort((a, b) => a.order - b.order)
      .forEach((step, index) => {
        step.changeOrder(index + 1)
      })
  }

  get id(): MissionId {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get robotDogIds(): RobotDogId[] {
    return this._robotDogIds
  }

  get userId(): string {
    return this._userId
  }

  get missionSteps(): MissionStep[] {
    return this._missionSteps
  }
}
```

- [ ] **Step 4: Simplify `MissionStep` entity**

Replace the whole file:

```typescript
// app/modules/missions/domain/entities/mission-step.entity.ts
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { InvalidMissionStepOrderError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-order.error'

export default class MissionStep {
  constructor(
    private readonly _id: MissionStepId,
    private _actionId: string,
    private _sequenceOrder: number,
    private _parameters: string
  ) {}

  static create(action: string, sequenceOrder: number, parameters: string) {
    if (sequenceOrder <= 0) {
      throw new InvalidMissionStepOrderError(sequenceOrder)
    }

    return new MissionStep(MissionStepId.generate(), action, sequenceOrder, parameters)
  }

  static rehydrate(id: string, action: string, sequenceOrder: number, parameters: string) {
    return new MissionStep(MissionStepId.fromString(id), action, sequenceOrder, parameters)
  }

  public changeOrder(newOrder: number) {
    this._sequenceOrder = newOrder
  }

  get id() {
    return this._id
  }
  get actionId() {
    return this._actionId
  }
  get order() {
    return this._sequenceOrder
  }
  get parameters() {
    return this._parameters
  }
}
```

- [ ] **Step 5: Run domain tests to verify they pass**

Run: `node ace test tests/unit/mission/domain/`
Expected: PASS for `mission.spec.ts` and `mission-run*.spec.ts`. This will still FAIL to typecheck as a whole project (repository/models/transformers below still reference the removed fields) — that's expected until the next steps.

- [ ] **Step 6: Update Lucid models — drop `status` columns**

```typescript
// app/modules/missions/infrastructure/database/models/mission.ts
import { BaseModel, column, hasMany, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import type { HasMany, HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'
import UserModel from '#users/infrastructure/database/models/user'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'

export default class MissionModel extends BaseModel {
  public static table = 'missions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @manyToMany(() => RobotDogModel, {
    pivotTable: 'mission_robot_dog',
    localKey: 'id',
    pivotForeignKey: 'mission_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'robot_dog_id',
  })
  declare robotDogs: ManyToMany<typeof RobotDogModel>

  @hasMany(() => MissionStepModel, {
    foreignKey: 'missionId',
  })
  declare steps: HasMany<typeof MissionStepModel>

  @column()
  declare userId: string

  @hasOne(() => UserModel)
  declare user: HasOne<typeof UserModel>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

```typescript
// app/modules/missions/infrastructure/database/models/mission-step.ts
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class MissionStepModel extends BaseModel {
  public static table = 'mission_steps'

  @column({ isPrimary: true })
  declare id: string

  @belongsTo(() => MissionModel)
  declare mission: BelongsTo<typeof MissionModel>

  @column()
  declare missionId: string

  @column()
  declare actionId: string

  @column()
  declare sequenceOrder: number

  @column()
  declare parameters: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

- [ ] **Step 7: Update `mission.repository.implementation.ts`**

In `findById`, `findAll`, `findByUser`, `listByRobotDog`: drop `row.status`/`.status` from every `Mission.rehydrate(...)` call and from every `MissionStep.rehydrate(...)` call (drop the trailing `s.status` argument). In `save`: drop `status: mission.status,` from the `MissionModel.updateOrCreate` payload and drop `status: step.status,` from the `stepsData` mapping.

- [ ] **Step 8: Update transformers**

```typescript
// app/modules/missions/infrastructure/http/transformers/mission.transformer.ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionStepTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-step.transformer'

export default class MissionTransformer extends BaseTransformer<Mission> {
  toObject() {
    return {
      id: this.resource.id.value,
      name: this.resource.name,
      userId: this.resource.userId,
      missionSteps: MissionStepTransformer.transform(this.resource.missionSteps),
    }
  }
}
```

```typescript
// app/modules/missions/infrastructure/http/transformers/mission-step.transformer.ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'

export default class MissionStepTransformer extends BaseTransformer<MissionStep> {
  toObject() {
    return {
      id: this.resource.id.value,
      actionId: this.resource.actionId,
      sequenceOrder: this.resource.order,
      parameters: this.resource.parameters,
    }
  }
}
```

- [ ] **Step 9: Create and fill the two column-drop migrations**

```bash
node ace make:migration drop_status_from_missions_table
node ace make:migration drop_status_from_mission_steps_table
```

```typescript
// database/migrations/..._drop_status_from_missions_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('status')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('status').notNullable().defaultTo('STAND_BY')
    })
  }
}
```

```typescript
// database/migrations/..._drop_status_from_mission_steps_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_steps'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('status')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('status').notNullable().defaultTo('PENDING')
    })
  }
}
```

- [ ] **Step 10: Run migrations, full test suite, and typecheck**

Run: `node ace migration:run && node ace test && npx tsc --noEmit`
Expected: Migrations apply cleanly. Test failures remaining should only be in files not yet touched: `add-mission-step.spec.ts`/`move-mission-step.spec.ts`/`sync-mission-steps.spec.ts` (if they assert on old behavior — check and leave as-is if they still pass, since `hasActiveRun` defaults to `false`), and any file under `robot-communication` still referencing `mission.status` (fixed in Task 9). Confirm no failures remain in the `missions` module itself.

- [ ] **Step 11: Commit**

```bash
git add app/modules/missions/domain/entities/mission.entity.ts app/modules/missions/domain/entities/mission-step.entity.ts app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts app/modules/missions/infrastructure/database/models/mission.ts app/modules/missions/infrastructure/database/models/mission-step.ts app/modules/missions/infrastructure/http/transformers/mission.transformer.ts app/modules/missions/infrastructure/http/transformers/mission-step.transformer.ts tests/unit/mission/domain/mission.spec.ts database/migrations
git commit -m "refactor(missions): drop Mission/MissionStep status in favor of MissionRun"
```

---

## Task 6: MissionRun persistence (tables, models, repository, DI)

**Files:**
- Create migration (via `node ace make:migration create_mission_runs_table`)
- Create migration (via `node ace make:migration create_mission_run_steps_table`)
- Create: `app/modules/missions/infrastructure/database/models/mission-run.ts`
- Create: `app/modules/missions/infrastructure/database/models/mission-run-step.ts`
- Create: `app/modules/missions/domain/contracts/mission-run.repository.ts`
- Create: `app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation.ts`
- Create: `tests/unit/fakes/fake-mission-run-repository.ts`
- Modify: `app/modules/missions/domain/contracts/mission.repository.ts` (add `isAssignedToDog`)
- Modify: `app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts` (implement `isAssignedToDog`)
- Modify: `tests/unit/fakes/fake-mission-repository.ts` (implement `isAssignedToDog`)
- Modify: `providers/mission_provider.ts` (bind `MissionRunRepository`)
- Test: `tests/unit/mission/application/mission-run-repository.spec.ts` (exercises the fake, since the Lucid implementation itself follows existing untested patterns — see note in Step 6)

**Interfaces:**
- Produces: `MissionRunRepository.findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null>`, `.findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null>`, `.hasActiveRunForMission(missionId: string): Promise<boolean>`, `.save(run: MissionRun): Promise<void>`. Produces `MissionRepository.isAssignedToDog(missionId: string, robotDogId: string): Promise<boolean>`. Consumed by Task 7, Task 8, Task 9, Task 10.

- [ ] **Step 1: Create the two migrations**

```bash
node ace make:migration create_mission_runs_table
node ace make:migration create_mission_run_steps_table
```

```typescript
// database/migrations/..._create_mission_runs_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_runs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('mission_id')
        .notNullable()
        .references('id')
        .inTable('missions')
        .onDelete('CASCADE')
      table
        .uuid('robot_dog_id')
        .notNullable()
        .references('id')
        .inTable('robot_dogs')
        .onDelete('CASCADE')
      table.string('status').notNullable()
      table.timestamp('started_at').notNullable()
      table.timestamp('ended_at').nullable()
      table.index(['mission_id', 'robot_dog_id', 'status'])

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

```typescript
// database/migrations/..._create_mission_run_steps_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_run_steps'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('mission_run_id')
        .notNullable()
        .references('id')
        .inTable('mission_runs')
        .onDelete('CASCADE')
      table
        .uuid('mission_step_id')
        .notNullable()
        .references('id')
        .inTable('mission_steps')
        .onDelete('CASCADE')
      table.string('status').notNullable()

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

Run: `node ace migration:run`
Expected: both tables created.

- [ ] **Step 2: Create the Lucid models**

```typescript
// app/modules/missions/infrastructure/database/models/mission-run.ts
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import MissionRunStepModel from '#app/modules/missions/infrastructure/database/models/mission-run-step'

export default class MissionRunModel extends BaseModel {
  public static table = 'mission_runs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare missionId: string

  @column()
  declare robotDogId: string

  @column()
  declare status: MissionRunStatus

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare endedAt: DateTime | null

  @hasMany(() => MissionRunStepModel, { foreignKey: 'missionRunId' })
  declare runSteps: HasMany<typeof MissionRunStepModel>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

```typescript
// app/modules/missions/infrastructure/database/models/mission-run-step.ts
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'

export default class MissionRunStepModel extends BaseModel {
  public static table = 'mission_run_steps'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare missionRunId: string

  @column()
  declare missionStepId: string

  @column()
  declare status: MissionStepStatus

  @belongsTo(() => MissionRunModel, { foreignKey: 'missionRunId' })
  declare missionRun: BelongsTo<typeof MissionRunModel>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

- [ ] **Step 3: Add `isAssignedToDog` to `MissionRepository` (contract, Lucid impl, fake)**

```typescript
// app/modules/missions/domain/contracts/mission.repository.ts — add this line to the abstract class
  abstract isAssignedToDog(missionId: string, robotDogId: string): Promise<boolean>
```

```typescript
// app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts — add this method
  async isAssignedToDog(missionId: string, robotDogId: string): Promise<boolean> {
    const row = await MissionModel.query()
      .where('id', missionId)
      .whereHas('robotDogs', (q) => q.where('robot_dog_id', robotDogId))
      .first()

    return row !== null
  }
```

```typescript
// tests/unit/fakes/fake-mission-repository.ts — add this method (reuses the existing `missionDogs` map)
  async isAssignedToDog(missionId: string, robotDogId: string): Promise<boolean> {
    return this.missionDogs.get(missionId)?.has(robotDogId) ?? false
  }
```

- [ ] **Step 4: Write the failing test for the fake `MissionRunRepository`**

```typescript
// tests/unit/mission/application/mission-run-repository.spec.ts
import { test } from '@japa/runner'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'

test.group('FakeMissionRunRepository', () => {
  test('findActiveRun only returns a RUNNING run for the given mission and robot', async ({ assert }) => {
    const repo = new FakeMissionRunRepository()
    const missionId = MissionId.generate()
    const robotDogId = RobotDogId.generate()
    const run = MissionRun.start(missionId, robotDogId, [MissionStepId.generate()])
    await repo.save(run)

    const found = await repo.findActiveRun(missionId.value, robotDogId.value)
    assert.isNotNull(found)
    assert.isTrue(found!.id.equals(run.id))

    assert.isNull(await repo.findActiveRun(MissionId.generate().value, robotDogId.value))
  })

  test('hasActiveRunForMission is true only while a run is RUNNING', async ({ assert }) => {
    const repo = new FakeMissionRunRepository()
    const missionId = MissionId.generate()
    const stepId = MissionStepId.generate()
    const run = MissionRun.start(missionId, RobotDogId.generate(), [stepId])
    await repo.save(run)

    assert.isTrue(await repo.hasActiveRunForMission(missionId.value))

    run.completeStep(stepId)
    await repo.save(run)

    assert.isFalse(await repo.hasActiveRunForMission(missionId.value))
  })

  test('findActiveRunByRobotDog ignores mission id', async ({ assert }) => {
    const repo = new FakeMissionRunRepository()
    const robotDogId = RobotDogId.generate()
    const run = MissionRun.start(MissionId.generate(), robotDogId, [MissionStepId.generate()])
    await repo.save(run)

    const found = await repo.findActiveRunByRobotDog(robotDogId.value)
    assert.isNotNull(found)
    assert.isTrue(found!.id.equals(run.id))
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `node ace test tests/unit/mission/application/mission-run-repository.spec.ts`
Expected: FAIL with "Cannot find module '#tests/unit/fakes/fake-mission-run-repository'"

- [ ] **Step 6: Implement the contract, the fake, and the Lucid implementation**

```typescript
// app/modules/missions/domain/contracts/mission-run.repository.ts
import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'

export abstract class MissionRunRepository {
  abstract findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null>
  abstract findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null>
  abstract hasActiveRunForMission(missionId: string): Promise<boolean>
  abstract save(run: MissionRun): Promise<void>
}
```

```typescript
// tests/unit/fakes/fake-mission-run-repository.ts
import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

export class FakeMissionRunRepository implements MissionRunRepository {
  public runs: MissionRun[] = []

  async findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null> {
    return (
      this.runs.find(
        (r) =>
          r.missionId.value === missionId &&
          r.robotDogId.value === robotDogId &&
          r.status === MissionRunStatus.RUNNING
      ) ?? null
    )
  }

  async findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null> {
    return (
      this.runs.find(
        (r) => r.robotDogId.value === robotDogId && r.status === MissionRunStatus.RUNNING
      ) ?? null
    )
  }

  async hasActiveRunForMission(missionId: string): Promise<boolean> {
    return this.runs.some(
      (r) => r.missionId.value === missionId && r.status === MissionRunStatus.RUNNING
    )
  }

  async save(run: MissionRun): Promise<void> {
    const index = this.runs.findIndex((r) => r.id.equals(run.id))
    if (index >= 0) {
      this.runs[index] = run
    } else {
      this.runs.push(run)
    }
  }
}
```

```typescript
// app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation.ts
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import MissionRunStepModel from '#app/modules/missions/infrastructure/database/models/mission-run-step'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

export class MissionRunRepositoryImplementation implements MissionRunRepository {
  async findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null> {
    const row = await MissionRunModel.query()
      .where('mission_id', missionId)
      .where('robot_dog_id', robotDogId)
      .where('status', MissionRunStatus.RUNNING)
      .preload('runSteps')
      .first()

    return row ? this.toDomain(row) : null
  }

  async findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null> {
    const row = await MissionRunModel.query()
      .where('robot_dog_id', robotDogId)
      .where('status', MissionRunStatus.RUNNING)
      .preload('runSteps')
      .first()

    return row ? this.toDomain(row) : null
  }

  async hasActiveRunForMission(missionId: string): Promise<boolean> {
    const row = await MissionRunModel.query()
      .where('mission_id', missionId)
      .where('status', MissionRunStatus.RUNNING)
      .first()

    return row !== null
  }

  async save(run: MissionRun): Promise<void> {
    await db.transaction(async (trx) => {
      await MissionRunModel.updateOrCreate(
        { id: run.id.value },
        {
          missionId: run.missionId.value,
          robotDogId: run.robotDogId.value,
          status: run.status,
          startedAt: DateTime.fromJSDate(run.startedAt),
          endedAt: run.endedAt ? DateTime.fromJSDate(run.endedAt) : null,
        },
        { client: trx }
      )

      const stepsData = run.runSteps.map((step) => ({
        id: step.id.value,
        missionRunId: run.id.value,
        missionStepId: step.stepId.value,
        status: step.status,
      }))

      await MissionRunStepModel.updateOrCreateMany('id', stepsData, { client: trx })
    })
  }

  private toDomain(row: MissionRunModel): MissionRun {
    const runSteps = row.runSteps.map((s) =>
      MissionRunStep.rehydrate(s.id, s.missionStepId, s.status)
    )

    return MissionRun.rehydrate(
      row.id,
      row.missionId,
      row.robotDogId,
      row.status,
      runSteps,
      row.startedAt.toJSDate(),
      row.endedAt ? row.endedAt.toJSDate() : null
    )
  }
}
```

Note: the Lucid implementation is not unit-tested directly, matching the existing convention in this module (`mission.repository.implementation.ts` has no dedicated spec file either — it's exercised indirectly through use-case tests that run against the fakes, and through manual/integration verification).

- [ ] **Step 7: Wire `MissionRunRepository` into the DI container**

In `providers/mission_provider.ts`, add the import and binding:

```typescript
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
```

```typescript
    this.app.container.bind(MissionRunRepository, () => {
      return this.app.container.make(MissionRunRepositoryImplementation)
    })
```

(add this bind call inside the existing `register()` method, alongside the other three).

- [ ] **Step 8: Run test to verify it passes**

Run: `node ace test tests/unit/mission/application/mission-run-repository.spec.ts`
Expected: PASS

- [ ] **Step 9: Full suite + typecheck**

Run: `node ace test && npx tsc --noEmit`
Expected: PASS (no more references to removed `Mission.status`/`MissionStep.status` outside `robot-communication`, which Task 9 still needs to fix — confirm remaining failures, if any, are isolated to that module).

- [ ] **Step 10: Commit**

```bash
git add database/migrations app/modules/missions/infrastructure/database/models/mission-run.ts app/modules/missions/infrastructure/database/models/mission-run-step.ts app/modules/missions/domain/contracts/mission-run.repository.ts app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation.ts app/modules/missions/domain/contracts/mission.repository.ts app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts tests/unit/fakes/fake-mission-run-repository.ts tests/unit/fakes/fake-mission-repository.ts providers/mission_provider.ts tests/unit/mission/application/mission-run-repository.spec.ts
git commit -m "feat(missions): persist MissionRun and add MissionRepository.isAssignedToDog"
```

---

## Task 7: Block step edits while a run is active

**Files:**
- Modify: `app/modules/missions/application/usecases/add-mission-step.use-case.ts`
- Modify: `app/modules/missions/application/usecases/remove-mission-step.use-case.ts`
- Modify: `app/modules/missions/application/usecases/move-mission-step.use-case.ts`
- Modify: `app/modules/missions/application/usecases/sync-mission-steps.use-case.ts`
- Modify: `tests/unit/mission/application/add-mission-step.spec.ts`
- Modify: `tests/unit/mission/application/move-mission-step.spec.ts`
- Modify: `tests/unit/mission/application/sync-mission-steps.spec.ts`
- Create: `tests/unit/mission/application/remove-mission-step.spec.ts` additions (extend existing file)

**Interfaces:**
- Consumes: `MissionRunRepository.hasActiveRunForMission` (Task 6), `Mission.addStep/removeStep/moveStep/syncSteps(..., hasActiveRun)` (Task 5).
- Produces: each use-case now takes `MissionRunRepository` as an added constructor dependency (all existing call sites that construct these use-cases directly in tests must be updated to pass a `FakeMissionRunRepository`).

- [ ] **Step 1: Write the failing test for `AddMissionStepUseCase`**

Add to `tests/unit/mission/application/add-mission-step.spec.ts` (update the existing `group.each.setup`-less instantiations to include the new fake, and add a new test):

```typescript
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
```

```typescript
  test('doit refuser si une mission a un run actif', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const runRepo = new FakeMissionRunRepository()
    const useCase = new AddMissionStepUseCase(repo, runRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)
    await runRepo.save(MissionRun.start(mission.id, RobotDogId.generate(), []))

    await assert.rejects(
      () => useCase.execute({ missionId: mission.id.value, actionId: 'move_to', parameters: 'test' }),
      InvalidMissionNotEditableError
    )
  })
```

Update the two existing `new AddMissionStepUseCase(repo)` calls to `new AddMissionStepUseCase(repo, new FakeMissionRunRepository())`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/mission/application/add-mission-step.spec.ts`
Expected: FAIL — `AddMissionStepUseCase` constructor doesn't accept a second argument yet.

- [ ] **Step 3: Update `AddMissionStepUseCase`**

```typescript
// app/modules/missions/application/usecases/add-mission-step.use-case.ts
import { AddMissionStepDto } from '#app/modules/missions/application/dto/add-mission-step.dto'
import { MissionRepository } from '../../domain/contracts/mission.repository.ts'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { inject } from '@adonisjs/core'

@inject()
export class AddMissionStepUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private missionRunRepository: MissionRunRepository
  ) {}

  async execute(dto: AddMissionStepDto): Promise<void> {
    const missionId = MissionId.fromString(dto.missionId)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.addStep(dto.actionId, dto.parameters, hasActiveRun)

    await this.missionRepository.save(mission)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test tests/unit/mission/application/add-mission-step.spec.ts`
Expected: PASS

- [ ] **Step 5: Apply the same change to `RemoveMissionStep`**

```typescript
// app/modules/missions/application/usecases/remove-mission-step.use-case.ts
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { inject } from '@adonisjs/core'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { RemoveMissionStepDto } from '#app/modules/missions/application/dto/remove-mission-step.dto'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'

@inject()
export default class RemoveMissionStep {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository
  ) {}

  public async execute(dto: RemoveMissionStepDto): Promise<void> {
    const mission = await this.missionRepository.findById(MissionId.fromString(dto.missionId))

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.removeStep(MissionStepId.fromString(dto.stepId), hasActiveRun)

    await this.missionRepository.save(mission)
  }
}
```

Add the analogous test (`'doit refuser si une mission a un run actif'`) to `tests/unit/mission/application/remove-mission-step.spec.ts`, and update its existing use-case instantiations to pass a `new FakeMissionRunRepository()` as the second constructor argument.

- [ ] **Step 6: Apply the same change to `MoveMissionStepUseCase`**

```typescript
// app/modules/missions/application/usecases/move-mission-step.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MoveMissionStepDto } from '#app/modules/missions/application/dto/move-mission-step.dto'

@inject()
export class MoveMissionStepUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private missionRunRepository: MissionRunRepository
  ) {}

  async execute(dto: MoveMissionStepDto): Promise<void> {
    logger.info('MoveMissionStepUseCase started', { dto })

    const missionId = MissionId.fromString(dto.missionId)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(missionId.value)
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.moveStep(MissionStepId.fromString(dto.stepId), dto.newOrder, hasActiveRun)
    await this.missionRepository.save(mission)
  }
}
```

Update `tests/unit/mission/application/move-mission-step.spec.ts` instantiations the same way and add the equivalent "refuse when a run is active" test.

- [ ] **Step 7: Apply the same change to `SyncMissionStepsUseCase`**

```typescript
// app/modules/missions/application/usecases/sync-mission-steps.use-case.ts
import { inject } from '@adonisjs/core'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'
import type { SyncMissionStepsDto } from '#app/modules/missions/application/dto/sync-mission-steps.dto'

@inject()
export class SyncMissionStepsUseCase {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly actionRepository: ActionRepository
  ) {}

  async execute(dto: SyncMissionStepsDto): Promise<Mission> {
    const mission = await this.missionRepository.findById(MissionId.fromString(dto.missionId))

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    const distinctActionIds = [...new Set(dto.steps.map((s) => s.actionId).filter(Boolean))]

    for (const actionId of distinctActionIds) {
      const action = await this.actionRepository.findById(ActionId.fromString(actionId))

      if (!action) {
        throw new ActionNotFoundError(actionId)
      }

      for (const step of dto.steps.filter((s) => s.actionId === actionId)) {
        action.validateParameters(step.parameters)
      }
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.syncSteps(dto.steps, hasActiveRun)
    await this.missionRepository.save(mission)

    return mission
  }
}
```

Update `tests/unit/mission/application/sync-mission-steps.spec.ts` instantiations (`new SyncMissionStepsUseCase(repo, actionRepo)` → `new SyncMissionStepsUseCase(repo, new FakeMissionRunRepository(), actionRepo)`, matching the new constructor parameter order) and add the equivalent "refuse when a run is active" test.

- [ ] **Step 8: Run full suite + typecheck**

Run: `node ace test && npx tsc --noEmit`
Expected: PASS across all four use-cases and their tests. Any HTTP controller instantiating these use-cases via `@inject()` needs no manual change — AdonisJS resolves the new constructor dependency automatically through the container binding from Task 6.

- [ ] **Step 9: Commit**

```bash
git add app/modules/missions/application/usecases/add-mission-step.use-case.ts app/modules/missions/application/usecases/remove-mission-step.use-case.ts app/modules/missions/application/usecases/move-mission-step.use-case.ts app/modules/missions/application/usecases/sync-mission-steps.use-case.ts tests/unit/mission/application/add-mission-step.spec.ts tests/unit/mission/application/remove-mission-step.spec.ts tests/unit/mission/application/move-mission-step.spec.ts tests/unit/mission/application/sync-mission-steps.spec.ts
git commit -m "feat(missions): block step edits while a MissionRun is active"
```

---

## Task 8: Wire `start_mission` / `stop_mission` to `MissionRun`

**Files:**
- Modify: `app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts`
- Modify: `tests/unit/robot-communication/application/send-robot-command.spec.ts`

**Interfaces:**
- Consumes: `MissionRepository.isAssignedToDog` + `.findById` (Task 6/existing), `MissionRunRepository.save` + `.findActiveRunByRobotDog` (Task 6), `MissionRun.start`/`.interrupt` (Task 4), `MissionNotAssignedToRobotError`/`NoActiveMissionRunError` (Task 1).
- Produces: `SendRobotCommandUseCase` now takes 4 constructor args instead of 2: `(dogRepository, communicationService, missionRepository, missionRunRepository)`. Every existing instantiation must be updated.

- [ ] **Step 1: Update the existing test file for the new constructor and write failing tests for the new behavior**

Replace the top of `tests/unit/robot-communication/application/send-robot-command.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { SendRobotCommandUseCase } from '#app/modules/robot-communication/application/use-cases/send-robot-command.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
```

Update both `group.each.setup` blocks to also create `missionRepo`/`runRepo` and pass them:

```typescript
  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    useCase = new SendRobotCommandUseCase(fakeRepo, fakeMqtt, missionRepo, runRepo)
  })
```

(declare `let missionRepo: FakeMissionRepository` and `let runRepo: FakeMissionRunRepository` alongside the existing `let` declarations in both `test.group` blocks).

The existing test `'accepte START_MISSION quand missionId est fourni'` currently passes an arbitrary, unassigned `missionId` — with the new assignment check this must now set up a real assigned mission. Replace it with:

```typescript
  test('accepte START_MISSION quand la mission est assignée au robot', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await useCase.execute(dog.id.value, {
      type: RobotCommand.START_MISSION,
      missionId: mission.id.value,
    })

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].missionId, mission.id.value)

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNotNull(run)
    assert.equal(run!.status, MissionRunStatus.RUNNING)
    assert.lengthOf(run!.runSteps, 1)
  })

  test('refuse START_MISSION si le robot n'"'"'est pas assigné à la mission', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)

    await assert.rejects(
      () =>
        useCase.execute(dog.id.value, { type: RobotCommand.START_MISSION, missionId: mission.id.value }),
      MissionNotAssignedToRobotError
    )
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('STOP_MISSION interrompt le run actif du robot', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await useCase.execute(dog.id.value, { type: RobotCommand.START_MISSION, missionId: mission.id.value })
    await useCase.execute(dog.id.value, { type: RobotCommand.STOP_MISSION })

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNull(run)
  })

  test('refuse STOP_MISSION si le robot n'"'"'a aucun run actif', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(
      () => useCase.execute(dog.id.value, { type: RobotCommand.STOP_MISSION }),
      NoActiveMissionRunError
    )
  })
```

Note: the JS string-escaping of the apostrophe in the two test titles above (`n'"'"'est`) is there so the shell-quoted plan renders correctly — when writing the actual `.ts` file, just use a plain apostrophe inside a double-quoted or template-literal test title (e.g. `"refuse START_MISSION si le robot n'est pas assigné à la mission"`).

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/robot-communication/application/send-robot-command.spec.ts`
Expected: FAIL — `SendRobotCommandUseCase` constructor doesn't accept the extra arguments yet, `MissionNotAssignedToRobotError`/`NoActiveMissionRunError` aren't thrown.

- [ ] **Step 3: Update `SendRobotCommandUseCase`**

```typescript
// app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts
import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import {
  RobotCommand,
  type RobotCommandPayload,
} from '#app/modules/robot-communication/domain/types/robot-command.type'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'

@inject()
export class SendRobotCommandUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService,
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository
  ) {}

  async execute(dogId: string, payload: RobotCommandPayload): Promise<void> {
    if (payload.type === RobotCommand.START_MISSION && !payload.missionId) {
      throw new InvalidRobotCommandError('missionId is required for START_MISSION command')
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))

    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    switch (payload.type) {
      case RobotCommand.START_MISSION: {
        const missionId = payload.missionId!
        const isAssigned = await this.missionRepository.isAssignedToDog(missionId, dogId)
        if (!isAssigned) {
          throw new MissionNotAssignedToRobotError(missionId, dogId)
        }

        const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
        if (!mission) {
          throw new MissionNotFoundError(missionId)
        }

        const run = MissionRun.start(
          mission.id,
          dog.id,
          mission.missionSteps.map((step) => step.id)
        )
        await this.missionRunRepository.save(run)

        dog.startMission()
        break
      }
      case RobotCommand.STOP_MISSION: {
        const activeRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)
        if (!activeRun) {
          throw new NoActiveMissionRunError(dogId)
        }

        activeRun.interrupt()
        await this.missionRunRepository.save(activeRun)

        dog.endMission()
        break
      }
      case RobotCommand.START_SESSION:
        dog.startSession()
        break
      case RobotCommand.END_SESSION:
        dog.endSession()
        break
      case RobotCommand.EMERGENCY_STOP:
        dog.markError()
        break
    }

    await this.communicationService.sendCommand(dogId, payload.type, payload.missionId)
    await this.dogRepository.save(dog)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test tests/unit/robot-communication/application/send-robot-command.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/robot-communication/application/use-cases/send-robot-command.use-case.ts tests/unit/robot-communication/application/send-robot-command.spec.ts
git commit -m "feat(robot-communication): start/stop mission now create/interrupt a MissionRun"
```

---

## Task 9: Route robot progress reports through `MissionRun` and retire `MissionStatus`

**Files:**
- Modify: `app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case.ts`
- Modify: `app/modules/missions/domain/events/mission-step-updated.event.ts`
- Modify: `app/modules/missions/domain/events/mission-completed.event.ts`
- Modify: `app/modules/notifications/application/listeners/mission-completed-sse.listener.ts`
- Modify: `app/modules/notifications/application/listeners/mission-step-updated-sse.listener.ts`
- Delete: `app/modules/missions/domain/enums/mission-status.ts` (last remaining references are removed in this task)
- Create: `tests/unit/robot-communication/application/handle-robot-mission-update.spec.ts`

**Interfaces:**
- Consumes: `MissionRunRepository.findActiveRun` (Task 6), `MissionRun.completeStep/failStep/isTerminal/status` (Task 4), `RobotDogRepository` (existing), `MissionRepository.findById` (existing).
- Produces: `HandleRobotMissionUpdateUseCase` now takes `(missionRepository, missionRunRepository, dogRepository)` and actually uses the `dogId` parameter (previously ignored, prefixed `_dogId`). `MissionStepUpdatedEvent` now carries `(missionId, robotDogId, stepId, stepStatus, runStatus)`. `MissionCompletedEvent` now carries `(userId, missionId, missionName, robotDogId, status: MissionRunStatus)`.

- [ ] **Step 1: Write the failing test for `HandleRobotMissionUpdateUseCase`**

```typescript
// tests/unit/robot-communication/application/handle-robot-mission-update.spec.ts
import { test } from '@japa/runner'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { HandleRobotMissionUpdateUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('HandleRobotMissionUpdateUseCase', (group) => {
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let dogRepo: FakeRobotDogRepository
  let useCase: HandleRobotMissionUpdateUseCase

  group.each.setup(() => {
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    dogRepo = new FakeRobotDogRepository()
    useCase = new HandleRobotMissionUpdateUseCase(missionRepo, runRepo, dogRepo)
  })

  test('complète le step du run actif de ce robot et termine le run quand tous les steps sont faits', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startMission()
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)

    const stepId = mission.missionSteps[0].id
    const run = MissionRun.start(mission.id, dog.id, [stepId])
    await runRepo.save(run)

    await useCase.execute(dog.id.value, {
      missionId: mission.id.value,
      stepId: stepId.value,
      status: MissionStepStatus.COMPLETED,
    })

    const updatedRun = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNull(updatedRun)

    const savedRun = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(savedRun.status, MissionRunStatus.SUCCESS)

    const savedDog = await dogRepo.findById(dog.id)
    assert.notEqual(savedDog!.state, 'IN_MISSION')
  })

  test("ignore silencieusement si aucun run actif n'existe pour ce robot", async ({ assert }) => {
    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    const stepId = mission.missionSteps[0].id

    await useCase.execute('unknown-dog-id', {
      missionId: mission.id.value,
      stepId: stepId.value,
      status: MissionStepStatus.COMPLETED,
    })

    assert.lengthOf(runRepo.runs, 0)
  })

  test('un step FAILED fait échouer le run et ne touche pas les autres robots sur la même mission', async ({
    assert,
  }) => {
    const dogA = RobotDog.create('SN-A', 'Rex', 80)
    dogA.startMission()
    await dogRepo.save(dogA)
    const dogB = RobotDog.create('SN-B', 'Fido', 80)
    dogB.startMission()
    await dogRepo.save(dogB)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    const stepId = mission.missionSteps[0].id

    const runA = MissionRun.start(mission.id, dogA.id, [stepId])
    await runRepo.save(runA)
    const runB = MissionRun.start(mission.id, dogB.id, [stepId])
    await runRepo.save(runB)

    await useCase.execute(dogA.id.value, {
      missionId: mission.id.value,
      stepId: stepId.value,
      status: MissionStepStatus.FAILED,
    })

    const savedRunA = runRepo.runs.find((r) => r.id.equals(runA.id))!
    assert.equal(savedRunA.status, MissionRunStatus.FAILED)

    const stillActiveRunB = await runRepo.findActiveRun(mission.id.value, dogB.id.value)
    assert.isNotNull(stillActiveRunB)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/robot-communication/application/handle-robot-mission-update.spec.ts`
Expected: FAIL — current constructor only takes `missionRepository`, `dogId` is ignored, run lookups don't exist.

- [ ] **Step 3: Update the two mission events**

```typescript
// app/modules/missions/domain/events/mission-step-updated.event.ts
import { BaseEvent } from '@adonisjs/core/events'
import { type MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { type MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

export default class MissionStepUpdatedEvent extends BaseEvent {
  constructor(
    public readonly missionId: string,
    public readonly robotDogId: string,
    public readonly stepId: string,
    public readonly stepStatus: MissionStepStatus,
    public readonly runStatus: MissionRunStatus
  ) {
    super()
  }
}
```

```typescript
// app/modules/missions/domain/events/mission-completed.event.ts
import { BaseEvent } from '@adonisjs/core/events'
import { type MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

export default class MissionCompletedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly missionId: string,
    public readonly missionName: string,
    public readonly robotDogId: string,
    public readonly status: MissionRunStatus
  ) {
    super()
  }
}
```

- [ ] **Step 4: Update the two SSE listeners**

```typescript
// app/modules/notifications/application/listeners/mission-completed-sse.listener.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import type MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

@inject()
export default class MissionCompletedSseListener {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: MissionCompletedEvent): Promise<void> {
    const isSuccess = event.status === MissionRunStatus.SUCCESS
    const type = isSuccess ? 'mission.completed' : 'mission.failed'
    const severity = isSuccess ? 'success' : 'critical'

    try {
      await this.notificationService.create(event.userId, type, severity, {
        missionName: event.missionName,
      })
      logger.info({ userId: event.userId, type }, 'MissionCompletedSseListener: notification created')
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'MissionCompletedSseListener: failed')
    }
  }
}
```

```typescript
// app/modules/notifications/application/listeners/mission-step-updated-sse.listener.ts
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import type MissionStepUpdatedEvent from '#app/modules/missions/domain/events/mission-step-updated.event'

export default class MissionStepUpdatedSseListener {
  async handle(event: MissionStepUpdatedEvent): Promise<void> {
    try {
      transmit.broadcast(`missions/${event.missionId}`, {
        type: 'robot.mission_step',
        missionId: event.missionId,
        robotDogId: event.robotDogId,
        stepId: event.stepId,
        stepStatus: event.stepStatus,
        runStatus: event.runStatus,
      } as unknown as Parameters<typeof transmit.broadcast>[1])
    } catch (error) {
      logger.error(
        { err: error, missionId: event.missionId },
        'MissionStepUpdatedSseListener: broadcast failed'
      )
    }
  }
}
```

- [ ] **Step 5: Update `HandleRobotMissionUpdateUseCase`**

```typescript
// app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import MissionStepUpdatedEvent from '#app/modules/missions/domain/events/mission-step-updated.event'
import MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import { type RobotMissionUpdate } from '#app/modules/robot-communication/domain/types/robot-mission-update.type'

@inject()
export class HandleRobotMissionUpdateUseCase {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly dogRepository: RobotDogRepository
  ) {}

  async execute(dogId: string, update: RobotMissionUpdate): Promise<void> {
    const run = await this.missionRunRepository.findActiveRun(update.missionId, dogId)

    if (!run) {
      logger.warn(
        { missionId: update.missionId, dogId },
        'HandleRobotMissionUpdate: no active run found'
      )
      return
    }

    const stepId = MissionStepId.fromString(update.stepId)

    if (update.status === MissionStepStatus.COMPLETED) {
      run.completeStep(stepId)
    } else if (update.status === MissionStepStatus.FAILED) {
      run.failStep(stepId)
    }

    await this.missionRunRepository.save(run)

    void MissionStepUpdatedEvent.dispatch(
      update.missionId,
      dogId,
      update.stepId,
      update.status,
      run.status
    )

    if (!run.isTerminal) {
      return
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (dog) {
      dog.endMission()
      await this.dogRepository.save(dog)
    }

    if (run.status === MissionRunStatus.SUCCESS || run.status === MissionRunStatus.FAILED) {
      const mission = await this.missionRepository.findById(MissionId.fromString(update.missionId))
      if (mission) {
        void MissionCompletedEvent.dispatch(mission.userId, update.missionId, mission.name, dogId, run.status)
      }
    }
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node ace test tests/unit/robot-communication/application/handle-robot-mission-update.spec.ts`
Expected: PASS

- [ ] **Step 7: Delete the now-fully-unused `MissionStatus` enum**

Run: `grep -rn "MissionStatus\b" app tests --include="*.ts"` — confirm zero results, then:

```bash
git rm app/modules/missions/domain/enums/mission-status.ts
```

- [ ] **Step 8: Full suite + typecheck**

Run: `node ace test && npx tsc --noEmit`
Expected: PASS, zero remaining references to `MissionStatus` or the old event field names (`missionStatus`, `event.status` typed as `MissionStatus`).

- [ ] **Step 9: Commit**

```bash
git add app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case.ts app/modules/missions/domain/events/mission-step-updated.event.ts app/modules/missions/domain/events/mission-completed.event.ts app/modules/notifications/application/listeners/mission-completed-sse.listener.ts app/modules/notifications/application/listeners/mission-step-updated-sse.listener.ts tests/unit/robot-communication/application/handle-robot-mission-update.spec.ts
git commit -m "feat(robot-communication): route mission step updates through MissionRun, retire MissionStatus"
```

---

## Task 10: Block unassigning a robot with an active run

**Files:**
- Modify: `app/modules/missions/application/usecases/remove-mission-to-dog.use-case.ts`
- Modify: `tests/unit/mission/application/remove-mission-to-dog.spec.ts`

**Interfaces:**
- Consumes: `MissionRunRepository.findActiveRun` (Task 6), `InvalidMissionAlreadyRunningError` (existing, `app/modules/missions/domain/exceptions/invalid-mission-already-running.error.ts` — reused here rather than adding a new error class, since the message "Mission is already running" already fits "you must stop the run before unassigning").
- Produces: `RemoveMissionToDogUseCase` now takes 3 constructor args: `(missionRepository, dogRepository, missionRunRepository)`.

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/mission/application/remove-mission-to-dog.spec.ts`:

```typescript
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
```

Add `let runRepo: FakeMissionRunRepository` to the `let` block and update `group.each.setup`:

```typescript
  group.each.setup(() => {
    repo = new FakeMissionRepository()
    dogGateway = new FakeRobotDogGateway()
    runRepo = new FakeMissionRunRepository()
    useCase = new RemoveMissionToDogUseCase(repo, dogGateway, runRepo)
  })
```

Add the new test:

```typescript
  test('should refuse to remove a robot with an active run on this mission', async ({ assert }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    await repo.assignToDog(mission.id.value, dogId)
    dogGateway.addRobot(dogId)
    await runRepo.save(MissionRun.start(mission.id, RobotDogId.fromString(dogId), []))

    await assert.rejects(
      () => useCase.execute(mission.id.value, dogId),
      InvalidMissionAlreadyRunningError
    )
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test tests/unit/mission/application/remove-mission-to-dog.spec.ts`
Expected: FAIL — `RemoveMissionToDogUseCase` constructor doesn't accept a third argument yet, and removal isn't blocked.

- [ ] **Step 3: Update `RemoveMissionToDogUseCase`**

```typescript
// app/modules/missions/application/usecases/remove-mission-to-dog.use-case.ts
import { MissionRepository } from '../../domain/contracts/mission.repository.ts'
import { inject } from '@adonisjs/core'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'

@inject()
export class RemoveMissionToDogUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private dogRepository: RobotDogGateway,
    private missionRunRepository: MissionRunRepository
  ) {}

  async execute(missionId: string, dogId: string): Promise<void> {
    const dog = await this.dogRepository.findBy(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(`Robot Dog with id ${dogId} not found`)
    }
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))

    if (!mission) {
      throw new MissionNotFoundError(missionId)
    }

    const activeRun = await this.missionRunRepository.findActiveRun(missionId, dogId)
    if (activeRun) {
      throw new InvalidMissionAlreadyRunningError()
    }

    await this.missionRepository.removeFromDog(missionId, dogId)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test tests/unit/mission/application/remove-mission-to-dog.spec.ts`
Expected: PASS

- [ ] **Step 5: Full suite + typecheck (whole project, final check for this plan)**

Run: `node ace test && npx tsc --noEmit`
Expected: PASS with zero failures across the entire suite.

- [ ] **Step 6: Commit**

```bash
git add app/modules/missions/application/usecases/remove-mission-to-dog.use-case.ts tests/unit/mission/application/remove-mission-to-dog.spec.ts
git commit -m "feat(missions): block unassigning a robot dog while its mission run is active"
```

---

## Post-plan verification

After Task 10, do a final end-to-end sanity check before considering this done:

- [ ] `node ace test` — full suite green.
- [ ] `npx tsc --noEmit` — no type errors.
- [ ] `npx eslint .` — no lint errors introduced.
- [ ] `grep -rn "MissionStatus\b\|mission\.status\|missionStatus" app tests --include="*.ts"` returns nothing (confirms the old field is fully gone, including in event/listener field names).
- [ ] Manually re-read `docs/superpowers/specs/2026-07-01-mission-robot-execution-design.md` against the final code once more — confirm every section (domain model, execution flow, edit/removal rules, errors) has a corresponding implementation.

