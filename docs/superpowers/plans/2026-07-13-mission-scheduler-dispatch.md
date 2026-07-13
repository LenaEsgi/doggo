# Mission Scheduler — Dispatch Mechanism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically start the right mission on the right robot at the right time, based on the `MissionSchedule` rows created by the CRUD feature (previous plan), without ever double-firing the same occurrence.

**Architecture:** A single BullMQ repeatable "tick" job fires every minute; its worker calls `DispatchDueMissionSchedulesUseCase`, which reads all enabled schedules from the DB (source of truth), finds the ones due at that minute, and — guarded by a unique DB constraint acting as a claim lock — enqueues each into a separate "dispatch" queue. A second worker consumes that queue and calls the existing `StartMissionCommandUseCase`, recording the outcome (`DISPATCHED` / `ROBOT_BUSY` / `ERROR`) for idempotency and audit. This is the tick/poll pattern chosen in `docs/superpowers/specs/2026-07-13-mission-scheduler-design.md` (same family as Kubernetes CronJob/Quartz/Sidekiq-cron), not a per-schedule BullMQ scheduler.

**Tech Stack:** AdonisJS 6, Lucid ORM (PostgreSQL), BullMQ 5 (`upsertJobScheduler`), Luxon, Japa test runner.

## Global Constraints

- The DB is the only source of truth for recurrence definitions; BullMQ is a pure delivery mechanism (tick every minute + a dispatch queue), never a place where "is this schedule due" logic lives.
- Idempotency/dedup is enforced by a DB unique constraint on `(mission_schedule_id, fired_for_minute)`, not by in-memory state — this must hold even with multiple app instances/workers.
- Timezone: a single, hardcoded app-wide constant `MISSION_SCHEDULE_TIMEZONE` (not an env var — see rationale in Task 3). `isDueAt` is evaluated against `now` converted into this zone; `fired_for_minute` is always stored as a UTC instant truncated to the minute.
- Robot busy at trigger time (`InvalidMissionAlreadyRunningError`) → record outcome `ROBOT_BUSY`, emit `MissionScheduleSkippedEvent`, no retry, no listener wired yet (per spec, notification wiring is a future iteration).
- Mission no longer assigned to the robot (`MissionNotAssignedToRobotError`) → record outcome `ERROR`, auto-disable the schedule (`enabled = false`).
- Any other error from `StartMissionCommandUseCase` → record outcome `ERROR`, rethrow (let BullMQ's normal failure/retry semantics apply, matching the existing `mission-timeouts` worker's `worker.on('failed', ...)` pattern — don't swallow unexpected errors).
- No Lucid Model for `mission_schedule_firings` — it backs a pure infrastructure/audit concern with no domain behavior, so the repository implementation talks to it directly via the `db` query builder (`@adonisjs/lucid/services/db`), avoiding unnecessary ceremony.
- Follow existing conventions exactly: hexagonal layering per module, `#app/modules/missions/*` import alias, BullMQ contract/impl/worker pattern already used for `MissionTimeoutQueue` (`app/modules/missions/infrastructure/queue/bullmq-mission-timeout-queue.ts` and its worker), provider `ready()` boot pattern in `providers/queue_provider.ts`.
- This plan builds directly on the previous plan's code (`docs/superpowers/plans/2026-07-13-mission-scheduler-crud.md`, already implemented and merged): `MissionSchedule` entity (with `isDueAt`, `enable`/`disable`), `MissionScheduleRepository` contract + `MissionScheduleRepositoryImplementation` + `FakeMissionScheduleRepository`, `MissionScheduleId`. Don't recreate any of these.

---

### Task 1: Migration — `mission_schedule_firings` table

**Files:**
- Create: `database/migrations/1783900000000_create_mission_schedule_firings_table.ts`

**Interfaces:**
- Produces: table `mission_schedule_firings` (id, mission_schedule_id, fired_for_minute, mission_run_id, outcome, created_at, updated_at), unique on `(mission_schedule_id, fired_for_minute)`. Consumed by Task 7 (repository implementation).

- [ ] **Step 1: Write the migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_schedule_firings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('mission_schedule_id')
        .notNullable()
        .references('id')
        .inTable('mission_schedules')
        .onDelete('CASCADE')
      table.timestamp('fired_for_minute').notNullable()
      table
        .uuid('mission_run_id')
        .nullable()
        .references('id')
        .inTable('mission_runs')
        .onDelete('SET NULL')
      table.string('outcome').nullable()
      table.unique(['mission_schedule_id', 'fired_for_minute'])

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

`outcome` is nullable because claiming a slot (Task 7's `tryClaim`) and recording its outcome are two separate steps: `tryClaim` inserts the row first (to win the race under the unique constraint) with `outcome = null`, and `recordOutcome` fills it in once dispatch has actually been attempted.

- [ ] **Step 2: Run the migration**

Run: `node ace migration:run`
Expected: output includes `migrated database/migrations/1783900000000_create_mission_schedule_firings_table.ts`

- [ ] **Step 3: Verify the schema**

Run: `node ace repl`, then:
```javascript
const db = (await import('@adonisjs/lucid/services/db')).default
const rows = await db.rawQuery("select column_name from information_schema.columns where table_name = 'mission_schedule_firings' order by column_name")
rows.rows.map(r => r.column_name)
```
Expected: array includes `id`, `mission_schedule_id`, `fired_for_minute`, `mission_run_id`, `outcome`, `created_at`, `updated_at`. Exit with `.exit`.

- [ ] **Step 4: Verify rollback and re-apply**

Run: `node ace migration:rollback` — expected: reverted. Run: `node ace migration:run` — expected: re-applied, table back.

- [ ] **Step 5: Commit**

```bash
git add database/migrations/1783900000000_create_mission_schedule_firings_table.ts
git commit -m "feat: add mission_schedule_firings table for dispatch idempotency"
```

---

### Task 2: `MissionScheduleRepository` — add `findEnabled()`

**Files:**
- Modify: `app/modules/missions/domain/contracts/mission-schedule.repository.ts`
- Modify: `tests/unit/fakes/fake-mission-schedule-repository.ts`
- Modify: `app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation.ts`
- Test: `tests/unit/fakes/fake-mission-schedule-repository.spec.ts` (append a test)
- Test: `tests/functional/missions/mission-schedule-repository.spec.ts` (append a test)

**Interfaces:**
- Produces: `MissionScheduleRepository.findEnabled(): Promise<MissionSchedule[]>`. Used by Task 5 (`DispatchDueMissionSchedulesUseCase`).

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/fakes/fake-mission-schedule-repository.spec.ts` (the existing file — add this test inside the existing `test.group`, after the existing test):

```typescript
  test('findEnabled returns only schedules that are enabled', async ({ assert }) => {
    const repo = new FakeMissionScheduleRepository()
    const missionId = MissionId.generate()
    const robotDogId = RobotDogId.generate()

    const enabledSchedule = MissionSchedule.create(missionId, robotDogId, [2], 10, 0)
    const disabledSchedule = MissionSchedule.create(missionId, robotDogId, [3], 11, 0)
    disabledSchedule.disable()

    await repo.save(enabledSchedule)
    await repo.save(disabledSchedule)

    const result = await repo.findEnabled()

    assert.lengthOf(result, 1)
    assert.equal(result[0].id.value, enabledSchedule.id.value)
  })
```

Append to `tests/functional/missions/mission-schedule-repository.spec.ts` (the existing file — add this test inside the existing `test.group`, after the existing test):

```typescript
  test('findEnabled excludes disabled schedules from the database', async ({ assert }) => {
    const repo = new MissionScheduleRepositoryImplementation()

    const user = await UserModel.create({
      firebaseUid: 'firebase-uid-mission-schedule-enabled',
      firstname: 'Test',
      lastname: 'User',
      email: 'mission-schedule-enabled@example.com',
      role: UserRole.USER,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-MISSION-SCHEDULE-002',
      key: 'MissionScheduleDogKey456',
      name: 'PatrolDog2',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol 2',
      userId: user.id,
    })

    const enabledSchedule = MissionSchedule.create(
      MissionId.fromString(mission.id),
      RobotDogId.fromString(dog.id),
      [3],
      9,
      0
    )
    const disabledSchedule = MissionSchedule.create(
      MissionId.fromString(mission.id),
      RobotDogId.fromString(dog.id),
      [5],
      10,
      0
    )
    disabledSchedule.disable()

    await repo.save(enabledSchedule)
    await repo.save(disabledSchedule)

    const result = await repo.findEnabled()

    assert.lengthOf(result, 1)
    assert.equal(result[0].id.value, enabledSchedule.id.value)
  })
```

This requires `RobotDogState` import in that test file — check the top of `tests/functional/missions/mission-schedule-repository.spec.ts` first; if `RobotDogState` isn't already imported there, add `import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'` to its imports.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node ace test --files="tests/unit/fakes/fake-mission-schedule-repository.spec.ts,tests/functional/missions/mission-schedule-repository.spec.ts"`
Expected: FAIL — `repo.findEnabled is not a function`

- [ ] **Step 3: Add `findEnabled` to the contract**

In `app/modules/missions/domain/contracts/mission-schedule.repository.ts`, add one line to the abstract class (keep everything else identical):

```typescript
import type MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { type MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'

export abstract class MissionScheduleRepository {
  abstract findById(id: MissionScheduleId): Promise<MissionSchedule | null>
  abstract findByMission(missionId: string): Promise<MissionSchedule[]>
  abstract findEnabled(): Promise<MissionSchedule[]>
  abstract save(schedule: MissionSchedule): Promise<void>
  abstract delete(id: MissionScheduleId): Promise<void>
}
```

- [ ] **Step 4: Implement in the fake**

In `tests/unit/fakes/fake-mission-schedule-repository.ts`, add this method to the class (keep everything else identical):

```typescript
  async findEnabled(): Promise<MissionSchedule[]> {
    return this.storedSchedules.filter((schedule) => schedule.enabled)
  }
```

- [ ] **Step 5: Implement in the real repository**

In `app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation.ts`, add this method to the class (keep everything else identical):

```typescript
  async findEnabled(): Promise<MissionSchedule[]> {
    const rows = await MissionScheduleModel.query().where('enabled', true)
    return rows.map((row) => this.toDomain(row))
  }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node ace test --files="tests/unit/fakes/fake-mission-schedule-repository.spec.ts,tests/functional/missions/mission-schedule-repository.spec.ts"`
Expected: PASS (2 tests in the fake spec, 2 tests in the functional spec)

- [ ] **Step 7: Commit**

```bash
git add app/modules/missions/domain/contracts/mission-schedule.repository.ts \
        tests/unit/fakes/fake-mission-schedule-repository.ts \
        app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation.ts \
        tests/unit/fakes/fake-mission-schedule-repository.spec.ts \
        tests/functional/missions/mission-schedule-repository.spec.ts
git commit -m "feat: add findEnabled to MissionScheduleRepository"
```

---

### Task 3: Firing outcome enum, `MissionScheduleFiringRepository` contract, fake, timezone constant

**Files:**
- Create: `app/modules/missions/domain/enums/mission-schedule-firing-outcome.ts`
- Create: `app/modules/missions/domain/contracts/mission-schedule-firing.repository.ts`
- Create: `tests/unit/fakes/fake-mission-schedule-firing-repository.ts`
- Create: `app/modules/missions/domain/mission-schedule-timezone.ts`
- Test: `tests/unit/fakes/fake-mission-schedule-firing-repository.spec.ts`

**Interfaces:**
- Produces: `MissionScheduleFiringOutcome` enum (`DISPATCHED`, `ROBOT_BUSY`, `ERROR`); `MissionScheduleFiringRepository` abstract class with `tryClaim(missionScheduleId: string, firedForMinute: DateTime): Promise<boolean>` and `recordOutcome(missionScheduleId: string, firedForMinute: DateTime, outcome: MissionScheduleFiringOutcome, missionRunId: string | null): Promise<void>`; `FakeMissionScheduleFiringRepository`; `MISSION_SCHEDULE_TIMEZONE` constant. Used by Tasks 5, 6, 7.

Rationale for a hardcoded constant instead of an env var: the spec calls for exactly one global value, changed rarely if ever, with no per-environment variation need. Adding it as a required env var would mean touching `.env`, `.env.test`, `.env.ci.test`, `.env.example`, and `start/env.ts`'s schema across every environment — more moving parts than the requirement justifies. A single exported constant is simpler and equally "global"; revisit as an env var only if multi-region deployment ever becomes a real requirement.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/fakes/fake-mission-schedule-firing-repository.spec.ts
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import { FakeMissionScheduleFiringRepository } from '#tests/unit/fakes/fake-mission-schedule-firing-repository'
import { MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

test.group('FakeMissionScheduleFiringRepository', () => {
  test('tryClaim returns true the first time and false on a repeat for the same minute', async ({
    assert,
  }) => {
    const repo = new FakeMissionScheduleFiringRepository()
    const scheduleId = randomUUID()
    const firedForMinute = DateTime.utc().set({ second: 0, millisecond: 0 })

    const first = await repo.tryClaim(scheduleId, firedForMinute)
    const second = await repo.tryClaim(scheduleId, firedForMinute)

    assert.isTrue(first)
    assert.isFalse(second)
  })

  test('tryClaim treats different minutes as independent claims', async ({ assert }) => {
    const repo = new FakeMissionScheduleFiringRepository()
    const scheduleId = randomUUID()
    const minuteOne = DateTime.utc().set({ second: 0, millisecond: 0 })
    const minuteTwo = minuteOne.plus({ minutes: 1 })

    assert.isTrue(await repo.tryClaim(scheduleId, minuteOne))
    assert.isTrue(await repo.tryClaim(scheduleId, minuteTwo))
  })

  test('recordOutcome stores the outcome and run id for later inspection', async ({ assert }) => {
    const repo = new FakeMissionScheduleFiringRepository()
    const scheduleId = randomUUID()
    const firedForMinute = DateTime.utc().set({ second: 0, millisecond: 0 })
    const runId = randomUUID()

    await repo.recordOutcome(scheduleId, firedForMinute, MissionScheduleFiringOutcome.DISPATCHED, runId)

    assert.lengthOf(repo.outcomes, 1)
    assert.equal(repo.outcomes[0].missionScheduleId, scheduleId)
    assert.equal(repo.outcomes[0].outcome, MissionScheduleFiringOutcome.DISPATCHED)
    assert.equal(repo.outcomes[0].missionRunId, runId)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/fakes/fake-mission-schedule-firing-repository.spec.ts"`
Expected: FAIL — `Cannot find module '#tests/unit/fakes/fake-mission-schedule-firing-repository'`

- [ ] **Step 3: Write the outcome enum**

```typescript
// app/modules/missions/domain/enums/mission-schedule-firing-outcome.ts
export enum MissionScheduleFiringOutcome {
  DISPATCHED = 'DISPATCHED',
  ROBOT_BUSY = 'ROBOT_BUSY',
  ERROR = 'ERROR',
}
```

- [ ] **Step 4: Write the repository contract**

```typescript
// app/modules/missions/domain/contracts/mission-schedule-firing.repository.ts
import { type DateTime } from 'luxon'
import { type MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

export abstract class MissionScheduleFiringRepository {
  abstract tryClaim(missionScheduleId: string, firedForMinute: DateTime): Promise<boolean>
  abstract recordOutcome(
    missionScheduleId: string,
    firedForMinute: DateTime,
    outcome: MissionScheduleFiringOutcome,
    missionRunId: string | null
  ): Promise<void>
}
```

- [ ] **Step 5: Write the timezone constant**

```typescript
// app/modules/missions/domain/mission-schedule-timezone.ts
export const MISSION_SCHEDULE_TIMEZONE = 'Europe/Paris'
```

- [ ] **Step 6: Write the fake**

```typescript
// tests/unit/fakes/fake-mission-schedule-firing-repository.ts
import { type DateTime } from 'luxon'
import { type MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { type MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

export class FakeMissionScheduleFiringRepository implements MissionScheduleFiringRepository {
  public claimed = new Set<string>()
  public outcomes: {
    missionScheduleId: string
    firedForMinute: DateTime
    outcome: MissionScheduleFiringOutcome
    missionRunId: string | null
  }[] = []

  private key(missionScheduleId: string, firedForMinute: DateTime): string {
    return `${missionScheduleId}:${firedForMinute.toMillis()}`
  }

  async tryClaim(missionScheduleId: string, firedForMinute: DateTime): Promise<boolean> {
    const key = this.key(missionScheduleId, firedForMinute)
    if (this.claimed.has(key)) {
      return false
    }
    this.claimed.add(key)
    return true
  }

  async recordOutcome(
    missionScheduleId: string,
    firedForMinute: DateTime,
    outcome: MissionScheduleFiringOutcome,
    missionRunId: string | null
  ): Promise<void> {
    this.outcomes.push({ missionScheduleId, firedForMinute, outcome, missionRunId })
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node ace test --files="tests/unit/fakes/fake-mission-schedule-firing-repository.spec.ts"`
Expected: PASS (3 tests passing)

- [ ] **Step 8: Commit**

```bash
git add app/modules/missions/domain/enums/mission-schedule-firing-outcome.ts \
        app/modules/missions/domain/contracts/mission-schedule-firing.repository.ts \
        app/modules/missions/domain/mission-schedule-timezone.ts \
        tests/unit/fakes/fake-mission-schedule-firing-repository.ts \
        tests/unit/fakes/fake-mission-schedule-firing-repository.spec.ts
git commit -m "feat: add MissionScheduleFiringRepository contract, outcome enum, timezone constant"
```

---

### Task 4: `MissionScheduleDispatchQueue` contract and fake

**Files:**
- Create: `app/modules/missions/domain/contracts/mission-schedule-dispatch-queue.ts`
- Create: `tests/unit/fakes/fake-mission-schedule-dispatch-queue.ts`
- Test: `tests/unit/fakes/fake-mission-schedule-dispatch-queue.spec.ts`

**Interfaces:**
- Produces: `MissionScheduleDispatchPayload` type (`{ scheduleId: string; missionId: string; dogId: string; firedForMinute: string }`); `MissionScheduleDispatchQueue` abstract class with `enqueue(payload: MissionScheduleDispatchPayload): Promise<void>`; `FakeMissionScheduleDispatchQueue`. Used by Tasks 5 (producer) and 6 (consumer's payload shape), and Task 8 (real BullMQ implementation).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/fakes/fake-mission-schedule-dispatch-queue.spec.ts
import { test } from '@japa/runner'
import { FakeMissionScheduleDispatchQueue } from '#tests/unit/fakes/fake-mission-schedule-dispatch-queue'

test.group('FakeMissionScheduleDispatchQueue', () => {
  test('records every enqueued payload in order', async ({ assert }) => {
    const queue = new FakeMissionScheduleDispatchQueue()

    await queue.enqueue({
      scheduleId: 'schedule-1',
      missionId: 'mission-1',
      dogId: 'dog-1',
      firedForMinute: '2024-01-04T12:45:00.000Z',
    })
    await queue.enqueue({
      scheduleId: 'schedule-2',
      missionId: 'mission-2',
      dogId: 'dog-2',
      firedForMinute: '2024-01-04T12:46:00.000Z',
    })

    assert.lengthOf(queue.enqueued, 2)
    assert.equal(queue.enqueued[0].scheduleId, 'schedule-1')
    assert.equal(queue.enqueued[1].scheduleId, 'schedule-2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/fakes/fake-mission-schedule-dispatch-queue.spec.ts"`
Expected: FAIL — `Cannot find module '#tests/unit/fakes/fake-mission-schedule-dispatch-queue'`

- [ ] **Step 3: Write the contract**

```typescript
// app/modules/missions/domain/contracts/mission-schedule-dispatch-queue.ts
export type MissionScheduleDispatchPayload = {
  scheduleId: string
  missionId: string
  dogId: string
  firedForMinute: string
}

export abstract class MissionScheduleDispatchQueue {
  abstract enqueue(payload: MissionScheduleDispatchPayload): Promise<void>
}
```

- [ ] **Step 4: Write the fake**

```typescript
// tests/unit/fakes/fake-mission-schedule-dispatch-queue.ts
import {
  type MissionScheduleDispatchPayload,
  type MissionScheduleDispatchQueue,
} from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'

export class FakeMissionScheduleDispatchQueue implements MissionScheduleDispatchQueue {
  public enqueued: MissionScheduleDispatchPayload[] = []

  async enqueue(payload: MissionScheduleDispatchPayload): Promise<void> {
    this.enqueued.push(payload)
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ace test --files="tests/unit/fakes/fake-mission-schedule-dispatch-queue.spec.ts"`
Expected: PASS (1 test passing)

- [ ] **Step 6: Commit**

```bash
git add app/modules/missions/domain/contracts/mission-schedule-dispatch-queue.ts \
        tests/unit/fakes/fake-mission-schedule-dispatch-queue.ts \
        tests/unit/fakes/fake-mission-schedule-dispatch-queue.spec.ts
git commit -m "feat: add MissionScheduleDispatchQueue contract and fake"
```

---

### Task 5: `DispatchDueMissionSchedulesUseCase` (the tick handler)

**Files:**
- Create: `app/modules/missions/application/usecases/dispatch-due-mission-schedules.use-case.ts`
- Test: `tests/unit/mission/application/dispatch-due-mission-schedules.spec.ts`

**Interfaces:**
- Consumes: `MissionScheduleRepository.findEnabled()` (Task 2), `MissionSchedule.isDueAt(now: DateTime): boolean` (existing), `MissionScheduleFiringRepository.tryClaim` (Task 3), `MissionScheduleDispatchQueue.enqueue` (Task 4), `MISSION_SCHEDULE_TIMEZONE` (Task 3).
- Produces: `DispatchDueMissionSchedulesUseCase.execute(now: DateTime): Promise<void>`. Used by Task 9 (tick worker).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/application/dispatch-due-mission-schedules.spec.ts
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { DispatchDueMissionSchedulesUseCase } from '#app/modules/missions/application/usecases/dispatch-due-mission-schedules.use-case'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import { FakeMissionScheduleFiringRepository } from '#tests/unit/fakes/fake-mission-schedule-firing-repository'
import { FakeMissionScheduleDispatchQueue } from '#tests/unit/fakes/fake-mission-schedule-dispatch-queue'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('DispatchDueMissionSchedulesUseCase', (group) => {
  let scheduleRepo: FakeMissionScheduleRepository
  let firingRepo: FakeMissionScheduleFiringRepository
  let dispatchQueue: FakeMissionScheduleDispatchQueue
  let useCase: DispatchDueMissionSchedulesUseCase

  group.each.setup(() => {
    scheduleRepo = new FakeMissionScheduleRepository()
    firingRepo = new FakeMissionScheduleFiringRepository()
    dispatchQueue = new FakeMissionScheduleDispatchQueue()
    useCase = new DispatchDueMissionSchedulesUseCase(scheduleRepo, firingRepo, dispatchQueue)
  })

  // 2024-01-04 12:45 UTC is a Thursday (ISO weekday 4); Europe/Paris is UTC+1 in January (no DST),
  // so this instant is 13:45 local time in Europe/Paris.
  const thursdayNoonUtc = DateTime.fromISO('2024-01-04T12:45:00.000Z', { zone: 'utc' })

  test('enqueues only schedules that are due at the given instant', async ({ assert }) => {
    const dueSchedule = MissionSchedule.create(
      MissionId.generate(),
      RobotDogId.generate(),
      [4],
      13,
      45
    )
    const notDueSchedule = MissionSchedule.create(
      MissionId.generate(),
      RobotDogId.generate(),
      [4],
      14,
      0
    )
    await scheduleRepo.save(dueSchedule)
    await scheduleRepo.save(notDueSchedule)

    await useCase.execute(thursdayNoonUtc)

    assert.lengthOf(dispatchQueue.enqueued, 1)
    assert.equal(dispatchQueue.enqueued[0].scheduleId, dueSchedule.id.value)
    assert.equal(dispatchQueue.enqueued[0].missionId, dueSchedule.missionId.value)
    assert.equal(dispatchQueue.enqueued[0].dogId, dueSchedule.robotDogId.value)
    assert.equal(dispatchQueue.enqueued[0].firedForMinute, '2024-01-04T12:45:00.000Z')
  })

  test('never enqueues a disabled schedule even if it matches the time', async ({ assert }) => {
    const disabledSchedule = MissionSchedule.create(
      MissionId.generate(),
      RobotDogId.generate(),
      [4],
      13,
      45
    )
    disabledSchedule.disable()
    await scheduleRepo.save(disabledSchedule)

    await useCase.execute(thursdayNoonUtc)

    assert.lengthOf(dispatchQueue.enqueued, 0)
  })

  test('does not enqueue a schedule whose occurrence was already claimed', async ({ assert }) => {
    const dueSchedule = MissionSchedule.create(
      MissionId.generate(),
      RobotDogId.generate(),
      [4],
      13,
      45
    )
    await scheduleRepo.save(dueSchedule)

    const alreadyFiredMinute = DateTime.fromISO('2024-01-04T12:45:00.000Z', { zone: 'utc' })
    await firingRepo.tryClaim(dueSchedule.id.value, alreadyFiredMinute)

    await useCase.execute(thursdayNoonUtc)

    assert.lengthOf(dispatchQueue.enqueued, 0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/application/dispatch-due-mission-schedules.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/application/usecases/dispatch-due-mission-schedules.use-case'`

- [ ] **Step 3: Write the use case**

```typescript
// app/modules/missions/application/usecases/dispatch-due-mission-schedules.use-case.ts
import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { MissionScheduleDispatchQueue } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { MISSION_SCHEDULE_TIMEZONE } from '#app/modules/missions/domain/mission-schedule-timezone'

@inject()
export class DispatchDueMissionSchedulesUseCase {
  constructor(
    private missionScheduleRepository: MissionScheduleRepository,
    private firingRepository: MissionScheduleFiringRepository,
    private dispatchQueue: MissionScheduleDispatchQueue
  ) {}

  async execute(now: DateTime): Promise<void> {
    const nowLocal = now.setZone(MISSION_SCHEDULE_TIMEZONE)
    const firedForMinute = now.toUTC().set({ second: 0, millisecond: 0 })

    const schedules = await this.missionScheduleRepository.findEnabled()
    const due = schedules.filter((schedule) => schedule.isDueAt(nowLocal))

    for (const schedule of due) {
      const claimed = await this.firingRepository.tryClaim(schedule.id.value, firedForMinute)
      if (!claimed) {
        continue
      }

      await this.dispatchQueue.enqueue({
        scheduleId: schedule.id.value,
        missionId: schedule.missionId.value,
        dogId: schedule.robotDogId.value,
        firedForMinute: firedForMinute.toISO()!,
      })
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/dispatch-due-mission-schedules.spec.ts"`
Expected: PASS (3 tests passing)

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/usecases/dispatch-due-mission-schedules.use-case.ts \
        tests/unit/mission/application/dispatch-due-mission-schedules.spec.ts
git commit -m "feat: add DispatchDueMissionSchedulesUseCase"
```

---

### Task 6: `MissionScheduleSkippedEvent` and `HandleMissionScheduleDispatchUseCase` (the dispatch worker's logic)

**Files:**
- Create: `app/modules/missions/domain/events/mission-schedule-skipped.event.ts`
- Create: `app/modules/missions/application/usecases/handle-mission-schedule-dispatch.use-case.ts`
- Test: `tests/unit/mission/application/handle-mission-schedule-dispatch.spec.ts`

**Interfaces:**
- Consumes: `StartMissionCommandUseCase` (existing, `#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case`), `MissionScheduleRepository` (Task 2, for auto-disable), `MissionScheduleFiringRepository.recordOutcome` (Task 3), `MissionScheduleDispatchPayload` (Task 4), `InvalidMissionAlreadyRunningError` / `MissionNotAssignedToRobotError` (existing).
- Produces: `MissionScheduleSkippedEvent(missionScheduleId: string, missionId: string, robotDogId: string)`; `HandleMissionScheduleDispatchUseCase.execute(payload: MissionScheduleDispatchPayload): Promise<void>`. Used by Task 9 (dispatch worker). No listener is wired to `MissionScheduleSkippedEvent` in this plan — notification wiring is a future iteration per the spec.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/application/handle-mission-schedule-dispatch.spec.ts
import { test } from '@japa/runner'
import { HandleMissionScheduleDispatchUseCase } from '#app/modules/missions/application/usecases/handle-mission-schedule-dispatch.use-case'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import { FakeMissionScheduleFiringRepository } from '#tests/unit/fakes/fake-mission-schedule-firing-repository'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

test.group('HandleMissionScheduleDispatchUseCase', (group) => {
  let dogRepo: FakeRobotDogRepository
  let mqtt: FakeRobotCommunicationService
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let timeoutQueue: FakeMissionTimeoutQueue
  let actionRepo: FakeActionRepository
  let scheduleRepo: FakeMissionScheduleRepository
  let firingRepo: FakeMissionScheduleFiringRepository
  let startMissionUseCase: StartMissionCommandUseCase
  let useCase: HandleMissionScheduleDispatchUseCase

  group.each.setup(() => {
    dogRepo = new FakeRobotDogRepository()
    mqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    timeoutQueue = new FakeMissionTimeoutQueue()
    actionRepo = new FakeActionRepository()
    scheduleRepo = new FakeMissionScheduleRepository()
    firingRepo = new FakeMissionScheduleFiringRepository()
    startMissionUseCase = new StartMissionCommandUseCase(
      dogRepo,
      mqtt,
      missionRepo,
      runRepo,
      timeoutQueue,
      actionRepo
    )
    useCase = new HandleMissionScheduleDispatchUseCase(startMissionUseCase, scheduleRepo, firingRepo)
  })

  test('starts the mission and records DISPATCHED with the run id on success', async ({ assert }) => {
    const dog = RobotDog.create('SN-SCHED-001', 'Rex', 80)
    await dogRepo.save(dog)

    const action = Action.create('SIT', 'Assis', 'sit', null, null)
    actionRepo.actions.push(action)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(action.id.value, '{}')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    const schedule = MissionSchedule.create(MissionId.fromString(mission.id.value), RobotDogId.fromString(dog.id.value), [4], 12, 45)
    await scheduleRepo.save(schedule)

    await useCase.execute({
      scheduleId: schedule.id.value,
      missionId: mission.id.value,
      dogId: dog.id.value,
      firedForMinute: '2024-01-04T12:45:00.000Z',
    })

    assert.lengthOf(mqtt.calls, 1)
    assert.lengthOf(firingRepo.outcomes, 1)
    assert.equal(firingRepo.outcomes[0].outcome, MissionScheduleFiringOutcome.DISPATCHED)
    assert.isNotNull(firingRepo.outcomes[0].missionRunId)
  })

  test('records ROBOT_BUSY and does not throw when the robot already has an active run', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-SCHED-002', 'Rex', 80)
    await dogRepo.save(dog)

    const action = Action.create('SIT', 'Assis', 'sit', null, null)
    actionRepo.actions.push(action)

    const missionA = Mission.create('Patrol A', 'user-1')
    missionA.addStep(action.id.value, '{}')
    await missionRepo.save(missionA)
    await missionRepo.assignToDog(missionA.id.value, dog.id.value)

    const missionB = Mission.create('Patrol B', 'user-1')
    missionB.addStep(action.id.value, '{}')
    await missionRepo.save(missionB)
    await missionRepo.assignToDog(missionB.id.value, dog.id.value)

    // Robot already busy running missionA
    await startMissionUseCase.execute(dog.id.value, missionA.id.value)

    const schedule = MissionSchedule.create(MissionId.fromString(missionB.id.value), RobotDogId.fromString(dog.id.value), [4], 12, 45)
    await scheduleRepo.save(schedule)

    await useCase.execute({
      scheduleId: schedule.id.value,
      missionId: missionB.id.value,
      dogId: dog.id.value,
      firedForMinute: '2024-01-04T12:45:00.000Z',
    })

    assert.lengthOf(firingRepo.outcomes, 1)
    assert.equal(firingRepo.outcomes[0].outcome, MissionScheduleFiringOutcome.ROBOT_BUSY)
    assert.isNull(firingRepo.outcomes[0].missionRunId)

    const stillEnabled = await scheduleRepo.findById(schedule.id)
    assert.isTrue(stillEnabled?.enabled)
  })

  test('records ERROR and auto-disables the schedule when the robot is no longer assigned to the mission', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-SCHED-003', 'Rex', 80)
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)
    // Deliberately NOT assigning dog to mission

    const schedule = MissionSchedule.create(MissionId.fromString(mission.id.value), RobotDogId.fromString(dog.id.value), [4], 12, 45)
    await scheduleRepo.save(schedule)

    await useCase.execute({
      scheduleId: schedule.id.value,
      missionId: mission.id.value,
      dogId: dog.id.value,
      firedForMinute: '2024-01-04T12:45:00.000Z',
    })

    assert.lengthOf(firingRepo.outcomes, 1)
    assert.equal(firingRepo.outcomes[0].outcome, MissionScheduleFiringOutcome.ERROR)

    const disabled = await scheduleRepo.findById(schedule.id)
    assert.isFalse(disabled?.enabled)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/application/handle-mission-schedule-dispatch.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/application/usecases/handle-mission-schedule-dispatch.use-case'`

- [ ] **Step 3: Write the event**

```typescript
// app/modules/missions/domain/events/mission-schedule-skipped.event.ts
import { BaseEvent } from '@adonisjs/core/events'

export default class MissionScheduleSkippedEvent extends BaseEvent {
  constructor(
    public readonly missionScheduleId: string,
    public readonly missionId: string,
    public readonly robotDogId: string
  ) {
    super()
  }
}
```

- [ ] **Step 4: Write the use case**

```typescript
// app/modules/missions/application/usecases/handle-mission-schedule-dispatch.use-case.ts
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { type MissionScheduleDispatchPayload } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import MissionScheduleSkippedEvent from '#app/modules/missions/domain/events/mission-schedule-skipped.event'

@inject()
export class HandleMissionScheduleDispatchUseCase {
  constructor(
    private startMissionUseCase: StartMissionCommandUseCase,
    private missionScheduleRepository: MissionScheduleRepository,
    private firingRepository: MissionScheduleFiringRepository
  ) {}

  async execute(payload: MissionScheduleDispatchPayload): Promise<void> {
    const firedForMinute = DateTime.fromISO(payload.firedForMinute)

    try {
      const run = await this.startMissionUseCase.execute(payload.dogId, payload.missionId)
      await this.firingRepository.recordOutcome(
        payload.scheduleId,
        firedForMinute,
        MissionScheduleFiringOutcome.DISPATCHED,
        run.id.value
      )
      return
    } catch (error) {
      if (error instanceof InvalidMissionAlreadyRunningError) {
        await this.firingRepository.recordOutcome(
          payload.scheduleId,
          firedForMinute,
          MissionScheduleFiringOutcome.ROBOT_BUSY,
          null
        )
        void MissionScheduleSkippedEvent.dispatch(payload.scheduleId, payload.missionId, payload.dogId)
        return
      }

      if (error instanceof MissionNotAssignedToRobotError) {
        await this.firingRepository.recordOutcome(
          payload.scheduleId,
          firedForMinute,
          MissionScheduleFiringOutcome.ERROR,
          null
        )
        const schedule = await this.missionScheduleRepository.findById(
          MissionScheduleId.fromString(payload.scheduleId)
        )
        if (schedule) {
          schedule.disable()
          await this.missionScheduleRepository.save(schedule)
        }
        return
      }

      await this.firingRepository.recordOutcome(
        payload.scheduleId,
        firedForMinute,
        MissionScheduleFiringOutcome.ERROR,
        null
      )
      throw error
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/handle-mission-schedule-dispatch.spec.ts"`
Expected: PASS (3 tests passing)

- [ ] **Step 6: Commit**

```bash
git add app/modules/missions/domain/events/mission-schedule-skipped.event.ts \
        app/modules/missions/application/usecases/handle-mission-schedule-dispatch.use-case.ts \
        tests/unit/mission/application/handle-mission-schedule-dispatch.spec.ts
git commit -m "feat: add HandleMissionScheduleDispatchUseCase and MissionScheduleSkippedEvent"
```

---

### Task 7: Infrastructure — `MissionScheduleFiringRepository` implementation

**Files:**
- Create: `app/modules/missions/infrastructure/database/repositories/mission-schedule-firing.repository.implementation.ts`
- Test: `tests/functional/missions/mission-schedule-firing-repository.spec.ts`

**Interfaces:**
- Consumes: `mission_schedule_firings` table (Task 1), `MissionScheduleFiringRepository` contract (Task 3).
- Produces: `MissionScheduleFiringRepositoryImplementation implements MissionScheduleFiringRepository`. Used by Task 10 (DI wiring).

- [ ] **Step 1: Write the failing test**

This integration test proves the unique-constraint-based claim actually prevents a double claim at the real database level — the single highest-risk item in this plan.

```typescript
// tests/functional/missions/mission-schedule-firing-repository.spec.ts
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionScheduleModel from '#app/modules/missions/infrastructure/database/models/mission-schedule'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionScheduleFiringRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule-firing.repository.implementation'
import { MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

test.group('MissionScheduleFiringRepositoryImplementation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function createSchedule(): Promise<string> {
    const user = await UserModel.create({
      firebaseUid: `firebase-uid-firing-${randomUUID()}`,
      firstname: 'Test',
      lastname: 'User',
      email: `firing-${randomUUID()}@example.com`,
      role: UserRole.USER,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: `SN-FIRING-${randomUUID().slice(0, 8)}`,
      key: 'FiringRepoDogKey1234',
      name: 'FiringDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Firing Test Mission',
      userId: user.id,
    })

    const schedule = await MissionScheduleModel.create({
      id: randomUUID(),
      missionId: mission.id,
      robotDogId: dog.id,
      daysOfWeek: [4],
      hour: 12,
      minute: 45,
      enabled: true,
    })

    return schedule.id
  }

  test('tryClaim returns true once and false on a repeated claim for the same minute', async ({
    assert,
  }) => {
    const repo = new MissionScheduleFiringRepositoryImplementation()
    const scheduleId = await createSchedule()
    const firedForMinute = DateTime.utc().set({ second: 0, millisecond: 0 })

    const first = await repo.tryClaim(scheduleId, firedForMinute)
    const second = await repo.tryClaim(scheduleId, firedForMinute)

    assert.isTrue(first)
    assert.isFalse(second)
  })

  test('tryClaim allows a different minute for the same schedule', async ({ assert }) => {
    const repo = new MissionScheduleFiringRepositoryImplementation()
    const scheduleId = await createSchedule()
    const minuteOne = DateTime.utc().set({ second: 0, millisecond: 0 })
    const minuteTwo = minuteOne.plus({ minutes: 1 })

    assert.isTrue(await repo.tryClaim(scheduleId, minuteOne))
    assert.isTrue(await repo.tryClaim(scheduleId, minuteTwo))
  })

  test('recordOutcome updates the claimed row with outcome and mission run id', async ({
    assert,
  }) => {
    const repo = new MissionScheduleFiringRepositoryImplementation()
    const scheduleId = await createSchedule()
    const firedForMinute = DateTime.utc().set({ second: 0, millisecond: 0 })

    await repo.tryClaim(scheduleId, firedForMinute)
    await repo.recordOutcome(
      scheduleId,
      firedForMinute,
      MissionScheduleFiringOutcome.ROBOT_BUSY,
      null
    )

    const db = (await import('@adonisjs/lucid/services/db')).default
    const row = await db
      .from('mission_schedule_firings')
      .where('mission_schedule_id', scheduleId)
      .first()

    assert.equal(row.outcome, MissionScheduleFiringOutcome.ROBOT_BUSY)
    assert.isNull(row.mission_run_id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/functional/missions/mission-schedule-firing-repository.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/infrastructure/database/repositories/mission-schedule-firing.repository.implementation'`

- [ ] **Step 3: Write the repository implementation**

No Lucid Model — this table has no domain entity, so the implementation talks to the table directly via the `db` query builder (see Global Constraints).

```typescript
// app/modules/missions/infrastructure/database/repositories/mission-schedule-firing.repository.implementation.ts
import { randomUUID } from 'node:crypto'
import { type DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { type MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { type MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

export class MissionScheduleFiringRepositoryImplementation implements MissionScheduleFiringRepository {
  async tryClaim(missionScheduleId: string, firedForMinute: DateTime): Promise<boolean> {
    const rows = await db
      .table('mission_schedule_firings')
      .insert({
        id: randomUUID(),
        mission_schedule_id: missionScheduleId,
        fired_for_minute: firedForMinute.toSQL()!,
      })
      .onConflict(['mission_schedule_id', 'fired_for_minute'])
      .ignore()
      .returning('id')

    return rows.length > 0
  }

  async recordOutcome(
    missionScheduleId: string,
    firedForMinute: DateTime,
    outcome: MissionScheduleFiringOutcome,
    missionRunId: string | null
  ): Promise<void> {
    await db
      .from('mission_schedule_firings')
      .where('mission_schedule_id', missionScheduleId)
      .where('fired_for_minute', firedForMinute.toSQL()!)
      .update({ outcome, mission_run_id: missionRunId })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/functional/missions/mission-schedule-firing-repository.spec.ts"`
Expected: PASS (3 tests passing)

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/infrastructure/database/repositories/mission-schedule-firing.repository.implementation.ts \
        tests/functional/missions/mission-schedule-firing-repository.spec.ts
git commit -m "feat: add MissionScheduleFiringRepositoryImplementation with real-DB claim test"
```

---

### Task 8: Infrastructure — `BullMqMissionScheduleDispatchQueue`

**Files:**
- Create: `app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch-queue.ts`

**Interfaces:**
- Consumes: `MissionScheduleDispatchQueue` contract and `MissionScheduleDispatchPayload` (Task 4).
- Produces: `BullMqMissionScheduleDispatchQueue implements MissionScheduleDispatchQueue`, exports `MISSION_SCHEDULE_DISPATCH_QUEUE_NAME`. Used by Task 9 (worker) and Task 10 (DI wiring).

This mirrors the existing `BullMqMissionTimeoutQueue` at `app/modules/missions/infrastructure/queue/bullmq-mission-timeout-queue.ts` — read it first for the established style (constructor takes `{ host, port }`, creates one `Queue` instance).

There is no unit test for this task: it's a thin, untestable-without-Redis wrapper around the BullMQ SDK, exactly like `BullMqMissionTimeoutQueue` (which also has no unit test). Its behavior is exercised indirectly by Task 10's manual verification step.

- [ ] **Step 1: Write the queue implementation**

```typescript
// app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch-queue.ts
import { Queue } from 'bullmq'
import {
  type MissionScheduleDispatchPayload,
  MissionScheduleDispatchQueue,
} from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'

export const MISSION_SCHEDULE_DISPATCH_QUEUE_NAME = 'mission-schedule-dispatch'

export class BullMqMissionScheduleDispatchQueue extends MissionScheduleDispatchQueue {
  private readonly queue: Queue

  constructor(connection: { host: string; port: number }) {
    super()
    this.queue = new Queue(MISSION_SCHEDULE_DISPATCH_QUEUE_NAME, { connection })
  }

  async enqueue(payload: MissionScheduleDispatchPayload): Promise<void> {
    await this.queue.add('dispatch-mission-schedule', payload)
  }
}
```

- [ ] **Step 2: Verify it compiles and doesn't break the suite**

Run: `node ace test`
Expected: same pass/fail counts as before this task (this file isn't wired into the container yet — that's Task 10 — so nothing exercises it yet; this step only guards against a typo breaking the TypeScript build). If the suite hits the known pre-existing flakiness (`unable to release database lock`) or the known pre-existing `ListUserRobotDogsController` failure, that's expected and unrelated — don't treat it as caused by this change.

- [ ] **Step 3: Commit**

```bash
git add app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch-queue.ts
git commit -m "feat: add BullMqMissionScheduleDispatchQueue"
```

---

### Task 9: Infrastructure — tick and dispatch workers, provider wiring

**Files:**
- Create: `app/modules/missions/infrastructure/queue/bullmq-mission-schedule-tick.worker.ts`
- Create: `app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch.worker.ts`
- Modify: `providers/mission_provider.ts`
- Modify: `providers/queue_provider.ts`

**Interfaces:**
- Consumes: `DispatchDueMissionSchedulesUseCase` (Task 5), `HandleMissionScheduleDispatchUseCase` (Task 6), `MissionScheduleFiringRepository`/`MissionScheduleFiringRepositoryImplementation` (Tasks 3/7), `MissionScheduleDispatchQueue`/`BullMqMissionScheduleDispatchQueue` (Tasks 4/8), `MISSION_SCHEDULE_DISPATCH_QUEUE_NAME` (Task 8).
- Produces: a running tick scheduler + two workers, wired at app boot.

This mirrors the existing pattern in `app/modules/missions/infrastructure/queue/bullmq-mission-timeout.worker.ts` (Worker construction, `worker.on('failed', ...)` logging) and `providers/queue_provider.ts` (`register()` binds the container, `ready()` starts workers only in the `'web'` environment). Read both first.

- [ ] **Step 1: Write the tick worker + scheduler registration**

```typescript
// app/modules/missions/infrastructure/queue/bullmq-mission-schedule-tick.worker.ts
import { Queue, Worker } from 'bullmq'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { DispatchDueMissionSchedulesUseCase } from '#app/modules/missions/application/usecases/dispatch-due-mission-schedules.use-case'

export const MISSION_SCHEDULE_TICK_QUEUE_NAME = 'mission-schedule-ticks'
const TICK_SCHEDULER_ID = 'mission-schedule-tick'

export async function registerMissionScheduleTick(connection: {
  host: string
  port: number
}): Promise<void> {
  const queue = new Queue(MISSION_SCHEDULE_TICK_QUEUE_NAME, { connection })
  await queue.upsertJobScheduler(TICK_SCHEDULER_ID, { pattern: '* * * * *' }, { name: 'tick' })
}

export function startMissionScheduleTickWorker(connection: {
  host: string
  port: number
}): Worker {
  const worker = new Worker(
    MISSION_SCHEDULE_TICK_QUEUE_NAME,
    async () => {
      const useCase = await app.container.make(DispatchDueMissionSchedulesUseCase)
      await useCase.execute(DateTime.utc())
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'MissionScheduleTickWorker: tick échoué')
  })

  return worker
}
```

`upsertJobScheduler` is idempotent by scheduler id — calling it on every boot is a safe no-op if the schedule is already registered in Redis, and heals it if Redis was flushed or the app is starting fresh.

- [ ] **Step 2: Write the dispatch worker**

```typescript
// app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch.worker.ts
import { Worker } from 'bullmq'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { MISSION_SCHEDULE_DISPATCH_QUEUE_NAME } from '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch-queue'
import { HandleMissionScheduleDispatchUseCase } from '#app/modules/missions/application/usecases/handle-mission-schedule-dispatch.use-case'
import { type MissionScheduleDispatchPayload } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'

export function startMissionScheduleDispatchWorker(connection: {
  host: string
  port: number
}): Worker {
  const worker = new Worker(
    MISSION_SCHEDULE_DISPATCH_QUEUE_NAME,
    async (job) => {
      const payload = job.data as MissionScheduleDispatchPayload
      const useCase = await app.container.make(HandleMissionScheduleDispatchUseCase)
      await useCase.execute(payload)
    },
    { connection, concurrency: 5 }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'MissionScheduleDispatchWorker: dispatch échoué')
  })

  return worker
}
```

- [ ] **Step 3: Wire `MissionScheduleFiringRepository` and `MissionScheduleDispatchQueue` into `MissionProvider`**

Modify `providers/mission_provider.ts` — add two imports and two bindings to the existing `register()` method, everything else in the file stays identical:

```typescript
import type { ApplicationService } from '@adonisjs/core/types'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission.repository.implementation'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionScheduleRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation'
import { MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { MissionScheduleFiringRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule-firing.repository.implementation'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { RobotDogGatewayImplementation } from '#app/modules/missions/infrastructure/gateways/robot-dog.gateway.implementation'
import { UserGateway } from '#app/modules/missions/application/contracts/user.gateway'
import { UserGatewayImplementation } from '#app/modules/missions/infrastructure/gateways/user.gateway.implementation'

export default class MissionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(MissionRepository, () => {
      return this.app.container.make(MissionRepositoryImplementation)
    })

    this.app.container.bind(MissionRunRepository, () => {
      return this.app.container.make(MissionRunRepositoryImplementation)
    })

    this.app.container.bind(MissionScheduleRepository, () => {
      return this.app.container.make(MissionScheduleRepositoryImplementation)
    })

    this.app.container.bind(MissionScheduleFiringRepository, () => {
      return this.app.container.make(MissionScheduleFiringRepositoryImplementation)
    })

    this.app.container.bind(RobotDogGateway, () => {
      return this.app.container.make(RobotDogGatewayImplementation)
    })

    this.app.container.bind(UserGateway, () => {
      return this.app.container.make(UserGatewayImplementation)
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
```

- [ ] **Step 4: Wire the dispatch queue binding and boot the tick scheduler + both workers in `QueueProvider`**

Read the current `providers/queue_provider.ts` first, then modify it to add the `MissionScheduleDispatchQueue` binding in `register()`, and start the tick scheduler + both new workers in `ready()`, alongside the existing timeout worker:

```typescript
import type { ApplicationService } from '@adonisjs/core/types'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import { BullMqMissionTimeoutQueue } from '#app/modules/missions/infrastructure/queue/bullmq-mission-timeout-queue'
import { MissionScheduleDispatchQueue } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { BullMqMissionScheduleDispatchQueue } from '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch-queue'
import env from '#start/env'

export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(MissionTimeoutQueue, () => {
      return new BullMqMissionTimeoutQueue({
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
      })
    })

    this.app.container.singleton(MissionScheduleDispatchQueue, () => {
      return new BullMqMissionScheduleDispatchQueue({
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
      })
    })
  }

  async ready() {
    if (this.app.getEnvironment() === 'web') {
      const connection = { host: env.get('REDIS_HOST'), port: env.get('REDIS_PORT') }

      const { startMissionTimeoutWorker } = await import(
        '#app/modules/missions/infrastructure/queue/bullmq-mission-timeout.worker'
      )
      startMissionTimeoutWorker(connection)

      const { registerMissionScheduleTick, startMissionScheduleTickWorker } = await import(
        '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-tick.worker'
      )
      await registerMissionScheduleTick(connection)
      startMissionScheduleTickWorker(connection)

      const { startMissionScheduleDispatchWorker } = await import(
        '#app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch.worker'
      )
      startMissionScheduleDispatchWorker(connection)
    }
  }
}
```

- [ ] **Step 5: Verify the app boots and the tick scheduler registers**

This requires Redis running locally (the existing `REDIS_HOST`/`REDIS_PORT` env vars, already used by the timeout queue — if Redis isn't reachable, this step will fail identically to how the existing timeout worker would fail, which is an environment prerequisite, not something to work around).

Run: `node ace repl`, then:
```javascript
const { Queue } = await import('bullmq')
const env = (await import('#start/env')).default
const queue = new Queue('mission-schedule-ticks', { connection: { host: env.get('REDIS_HOST'), port: env.get('REDIS_PORT') } })
const schedulers = await queue.getJobSchedulers()
schedulers.map(s => ({ id: s.id, pattern: s.pattern }))
```
Expected (after the app has booted at least once with this code, e.g. via `node ace serve` briefly, or after Step 6's test run causes the provider to boot): an array containing `{ id: 'mission-schedule-tick', pattern: '* * * * *' }`. Exit with `.exit`.

If the app hasn't booted yet in `'web'` environment (test runs boot in `'test'` environment, which does NOT start workers per the `if (this.app.getEnvironment() === 'web')` guard — this is intentional, matching the existing timeout worker, so tests never spin up real background workers), start it briefly with `node ace serve` in the background, wait a few seconds, then check, then stop it. Do not leave a server process running after this verification.

- [ ] **Step 6: Run the full test suite**

Run: `node ace test`
Expected: all tests from this plan's prior tasks pass, plus no regressions elsewhere. Known pre-existing flakiness: intermittent `unable to release database lock` (environment issue) and the pre-existing failing unit test `ListUserRobotDogsController returns dogs list` — both unrelated to this change.

- [ ] **Step 7: Commit**

```bash
git add app/modules/missions/infrastructure/queue/bullmq-mission-schedule-tick.worker.ts \
        app/modules/missions/infrastructure/queue/bullmq-mission-schedule-dispatch.worker.ts \
        providers/mission_provider.ts \
        providers/queue_provider.ts
git commit -m "feat: boot the mission schedule tick and dispatch workers"
```

---

## What this plan deliberately does not cover

- No SSE/notification listener wired to `MissionScheduleSkippedEvent` — the event is emitted so a future notification iteration can subscribe to it, per the spec.
- No frontend.
- No per-schedule or per-user timezone — a single hardcoded `MISSION_SCHEDULE_TIMEZONE` constant for the whole app.
- No retry policy tuning, no dead-letter queue, no metrics/observability beyond the `mission_schedule_firings` audit trail and existing `logger.error` calls on worker failure — out of scope unless a future need arises.
