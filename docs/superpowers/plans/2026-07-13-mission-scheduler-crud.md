# Mission Scheduler — Modèle & CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user define one or more recurring weekly schedules (days of week + time) on a mission, targeting a specific robot, through a backend CRUD API — without yet triggering anything automatically (that's a separate follow-up plan).

**Architecture:** New `mission-schedules` sub-module inside the existing `missions` module, following the exact hexagonal layering already used there (domain entities/value-objects/contracts/exceptions, application DTOs/use-cases, infrastructure database/http). A `MissionSchedule` entity holds a pure `isDueAt(now)` predicate used later by the dispatch mechanism (next plan) but not wired to any trigger yet.

**Tech Stack:** AdonisJS 6, Lucid ORM (PostgreSQL, `pg` driver), VineJS validators, Bouncer policies, Luxon for dates, Japa test runner.

## Global Constraints

- Recurrence is weekly-only: a set of days of week (1=Monday..7=Sunday) + one `hour`/`minute`. No cron strings, no monthly recurrence, no multiple times per day (per `docs/superpowers/specs/2026-07-13-mission-scheduler-design.md`).
- A mission can have multiple independent `MissionSchedule` rows (no uniqueness constraint on `mission_id`).
- Each schedule targets exactly one `robot_dog_id`, fixed at creation.
- Single global timezone for the whole app — no per-schedule timezone field in this plan.
- Lifecycle is a simple `enabled`/`disabled` boolean — no end date.
- This plan does NOT implement automatic triggering (tick job, dispatch queue, `mission_schedule_firings` table). That is the next plan. `MissionSchedule.isDueAt()` is written now (pure domain logic) but nothing calls it yet.
- Follow the existing module conventions exactly: hexagonal layering, `#app/modules/missions/*` import alias, Lucid `updateOrCreate` repositories, VineJS validators, Bouncer `MissionPolicy`.

---

### Task 1: Migration — recreate `mission_schedules` table

**Files:**
- Create: `database/migrations/1783700000000_recreate_mission_schedules_table.ts`

**Interfaces:**
- Produces: table `mission_schedules` with columns `id, mission_id, robot_dog_id, days_of_week (smallint[]), hour (smallint), minute (smallint), enabled (boolean), created_at, updated_at`. Consumed by Task 9 (Lucid model).

- [ ] **Step 1: Write the migration**

The existing `mission_schedules` table (from `1771244533584_create_mission_schedules_table.ts`) is unused by any code (no model, no repository references it anywhere in `app/`). It models a one-shot `planned_at` timestamp, not a recurrence — replace it entirely.

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_schedules'

  async up() {
    this.schema.dropTable(this.tableName)

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
      table.specificType('days_of_week', 'smallint[]').notNullable()
      table.smallint('hour').notNullable()
      table.smallint('minute').notNullable()
      table.boolean('enabled').notNullable().defaultTo(true)
      table.index(['mission_id'])

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)

    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('mission_id').unique().references('id').inTable('missions').onDelete('CASCADE')
      table.timestamp('planned_at').notNullable()

      table.timestamps(true, true)
    })
  }
}
```

- [ ] **Step 2: Run the migration**

Run: `node ace migration:run`
Expected: output includes `migrated database/migrations/1783700000000_recreate_mission_schedules_table.ts`

- [ ] **Step 3: Verify the new schema**

Run: `node ace repl`, then inside the REPL session:
```javascript
const db = (await import('@adonisjs/lucid/services/db')).default
const rows = await db.rawQuery("select column_name from information_schema.columns where table_name = 'mission_schedules' order by column_name")
rows.rows.map(r => r.column_name)
```
Expected: array includes `days_of_week`, `enabled`, `hour`, `minute`, `mission_id`, `robot_dog_id` and does NOT include `planned_at`. Exit the REPL with `.exit`.

- [ ] **Step 4: Verify rollback restores the original schema**

Run: `node ace migration:rollback`
Expected: output includes `reverted database/migrations/1783700000000_recreate_mission_schedules_table.ts`

- [ ] **Step 5: Re-apply the migration**

Run: `node ace migration:run`
Expected: migration re-applied, leaving the DB in the new schema for subsequent tasks.

- [ ] **Step 6: Commit**

```bash
git add database/migrations/1783700000000_recreate_mission_schedules_table.ts
git commit -m "feat: recreate mission_schedules table for weekly recurrence"
```

---

### Task 2: Domain — `MissionScheduleId`, errors, and `MissionSchedule` entity

**Files:**
- Create: `app/modules/missions/domain/value-objects/mission-schedule-id.ts`
- Create: `app/modules/missions/domain/exceptions/invalid-mission-schedule-id.error.ts`
- Create: `app/modules/missions/domain/exceptions/invalid-mission-schedule-days-of-week.error.ts`
- Create: `app/modules/missions/domain/exceptions/invalid-mission-schedule-hour.error.ts`
- Create: `app/modules/missions/domain/exceptions/invalid-mission-schedule-minute.error.ts`
- Create: `app/modules/missions/domain/entities/mission-schedule.entity.ts`
- Test: `tests/unit/mission/domain/mission-schedule.spec.ts`

**Interfaces:**
- Consumes: `MissionId` (`#app/modules/missions/domain/value-objects/mission-id`), `RobotDogId` (`#dogs/domain/value-objects/robot-dog-id`), `UniqueEntityId` (`#app/modules/share/entities/unique-entity-id`), `DomainError` (`#app/modules/share/exceptions/domain-error`).
- Produces: `MissionSchedule.create(missionId: MissionId, robotDogId: RobotDogId, daysOfWeek: number[], hour: number, minute: number): MissionSchedule`; `MissionSchedule.rehydrate(id: string, missionId: string, robotDogId: string, daysOfWeek: number[], hour: number, minute: number, enabled: boolean): MissionSchedule`; instance methods `update(daysOfWeek: number[], hour: number, minute: number): void`, `enable(): void`, `disable(): void`, `isDueAt(now: DateTime): boolean`; getters `id, missionId, robotDogId, daysOfWeek, hour, minute, enabled`. Used by Tasks 3–9.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/domain/mission-schedule.spec.ts
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionScheduleDaysOfWeekError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-days-of-week.error'
import { InvalidMissionScheduleHourError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-hour.error'
import { InvalidMissionScheduleMinuteError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-minute.error'

test.group('MissionSchedule', () => {
  const missionId = MissionId.generate()
  const robotDogId = RobotDogId.generate()

  test('creates a schedule with normalized (deduped, sorted) days of week', ({ assert }) => {
    const schedule = MissionSchedule.create(missionId, robotDogId, [4, 2, 4], 16, 30)

    assert.deepEqual(schedule.daysOfWeek, [2, 4])
    assert.equal(schedule.hour, 16)
    assert.equal(schedule.minute, 30)
    assert.isTrue(schedule.enabled)
  })

  test('throws when days of week is empty', ({ assert }) => {
    assert.throws(
      () => MissionSchedule.create(missionId, robotDogId, [], 12, 45),
      InvalidMissionScheduleDaysOfWeekError
    )
  })

  test('throws when a day of week is out of range', ({ assert }) => {
    assert.throws(
      () => MissionSchedule.create(missionId, robotDogId, [0], 12, 45),
      InvalidMissionScheduleDaysOfWeekError
    )
    assert.throws(
      () => MissionSchedule.create(missionId, robotDogId, [8], 12, 45),
      InvalidMissionScheduleDaysOfWeekError
    )
  })

  test('throws when hour is out of range', ({ assert }) => {
    assert.throws(
      () => MissionSchedule.create(missionId, robotDogId, [4], 24, 0),
      InvalidMissionScheduleHourError
    )
  })

  test('throws when minute is out of range', ({ assert }) => {
    assert.throws(
      () => MissionSchedule.create(missionId, robotDogId, [4], 12, 60),
      InvalidMissionScheduleMinuteError
    )
  })

  test('isDueAt returns true only when enabled, day, hour and minute all match', ({ assert }) => {
    const schedule = MissionSchedule.create(missionId, robotDogId, [4], 12, 45)

    // 2024-01-04 is a Thursday (ISO weekday 4)
    const thursdayAtRightTime = DateTime.fromObject({
      year: 2024,
      month: 1,
      day: 4,
      hour: 12,
      minute: 45,
    })
    const thursdayAtWrongTime = DateTime.fromObject({
      year: 2024,
      month: 1,
      day: 4,
      hour: 12,
      minute: 46,
    })
    // 2024-01-05 is a Friday (ISO weekday 5)
    const fridayAtRightTime = DateTime.fromObject({
      year: 2024,
      month: 1,
      day: 5,
      hour: 12,
      minute: 45,
    })

    assert.isTrue(schedule.isDueAt(thursdayAtRightTime))
    assert.isFalse(schedule.isDueAt(thursdayAtWrongTime))
    assert.isFalse(schedule.isDueAt(fridayAtRightTime))
  })

  test('isDueAt returns false when the schedule is disabled', ({ assert }) => {
    const schedule = MissionSchedule.create(missionId, robotDogId, [4], 12, 45)
    schedule.disable()

    const thursdayAtRightTime = DateTime.fromObject({
      year: 2024,
      month: 1,
      day: 4,
      hour: 12,
      minute: 45,
    })

    assert.isFalse(schedule.isDueAt(thursdayAtRightTime))
  })

  test('update replaces days, hour and minute after re-validating them', ({ assert }) => {
    const schedule = MissionSchedule.create(missionId, robotDogId, [4], 12, 45)

    schedule.update([1, 3], 8, 0)

    assert.deepEqual(schedule.daysOfWeek, [1, 3])
    assert.equal(schedule.hour, 8)
    assert.equal(schedule.minute, 0)

    assert.throws(() => schedule.update([], 8, 0), InvalidMissionScheduleDaysOfWeekError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/domain/mission-schedule.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/domain/entities/mission-schedule.entity'` (or similar module-not-found error), since none of the source files exist yet.

- [ ] **Step 3: Write the value object**

```typescript
// app/modules/missions/domain/value-objects/mission-schedule-id.ts
import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionScheduleIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-id.error'

export class MissionScheduleId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionScheduleId {
    return new MissionScheduleId(this.generateUuid())
  }

  public static fromString(value: string): MissionScheduleId {
    try {
      this.validate(value)
      return new MissionScheduleId(value)
    } catch {
      throw new InvalidMissionScheduleIdError(value)
    }
  }
}
```

- [ ] **Step 4: Write the domain errors**

```typescript
// app/modules/missions/domain/exceptions/invalid-mission-schedule-id.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionScheduleIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionScheduleId: ${value}`)
  }
}
```

```typescript
// app/modules/missions/domain/exceptions/invalid-mission-schedule-days-of-week.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionScheduleDaysOfWeekError extends DomainError {
  readonly code = 'MISSION_SCHEDULE_INVALID_DAYS_OF_WEEK'

  constructor(message: string) {
    super(message)
  }
}
```

```typescript
// app/modules/missions/domain/exceptions/invalid-mission-schedule-hour.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionScheduleHourError extends DomainError {
  readonly code = 'MISSION_SCHEDULE_INVALID_HOUR'

  constructor(hour: number) {
    super(`Invalid hour for MissionSchedule: ${hour}. Must be between 0 and 23.`)
  }
}
```

```typescript
// app/modules/missions/domain/exceptions/invalid-mission-schedule-minute.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionScheduleMinuteError extends DomainError {
  readonly code = 'MISSION_SCHEDULE_INVALID_MINUTE'

  constructor(minute: number) {
    super(`Invalid minute for MissionSchedule: ${minute}. Must be between 0 and 59.`)
  }
}
```

- [ ] **Step 5: Write the entity**

```typescript
// app/modules/missions/domain/entities/mission-schedule.entity.ts
import { DateTime } from 'luxon'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionScheduleDaysOfWeekError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-days-of-week.error'
import { InvalidMissionScheduleHourError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-hour.error'
import { InvalidMissionScheduleMinuteError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-minute.error'

export default class MissionSchedule {
  private constructor(
    private readonly _id: MissionScheduleId,
    private readonly _missionId: MissionId,
    private readonly _robotDogId: RobotDogId,
    private _daysOfWeek: number[],
    private _hour: number,
    private _minute: number,
    private _enabled: boolean
  ) {}

  public static create(
    missionId: MissionId,
    robotDogId: RobotDogId,
    daysOfWeek: number[],
    hour: number,
    minute: number
  ): MissionSchedule {
    const normalizedDays = MissionSchedule.normalizeDaysOfWeek(daysOfWeek)
    MissionSchedule.validateHour(hour)
    MissionSchedule.validateMinute(minute)

    return new MissionSchedule(
      MissionScheduleId.generate(),
      missionId,
      robotDogId,
      normalizedDays,
      hour,
      minute,
      true
    )
  }

  public static rehydrate(
    id: string,
    missionId: string,
    robotDogId: string,
    daysOfWeek: number[],
    hour: number,
    minute: number,
    enabled: boolean
  ): MissionSchedule {
    return new MissionSchedule(
      MissionScheduleId.fromString(id),
      MissionId.fromString(missionId),
      RobotDogId.fromString(robotDogId),
      daysOfWeek,
      hour,
      minute,
      enabled
    )
  }

  public update(daysOfWeek: number[], hour: number, minute: number): void {
    const normalizedDays = MissionSchedule.normalizeDaysOfWeek(daysOfWeek)
    MissionSchedule.validateHour(hour)
    MissionSchedule.validateMinute(minute)

    this._daysOfWeek = normalizedDays
    this._hour = hour
    this._minute = minute
  }

  public enable(): void {
    this._enabled = true
  }

  public disable(): void {
    this._enabled = false
  }

  public isDueAt(now: DateTime): boolean {
    return (
      this._enabled &&
      this._daysOfWeek.includes(now.weekday) &&
      now.hour === this._hour &&
      now.minute === this._minute
    )
  }

  private static normalizeDaysOfWeek(daysOfWeek: number[]): number[] {
    if (!daysOfWeek || daysOfWeek.length === 0) {
      throw new InvalidMissionScheduleDaysOfWeekError('Days of week cannot be empty')
    }

    if (daysOfWeek.some((day) => day < 1 || day > 7)) {
      throw new InvalidMissionScheduleDaysOfWeekError(
        'Days of week must be between 1 (Monday) and 7 (Sunday)'
      )
    }

    return [...new Set(daysOfWeek)].sort((a, b) => a - b)
  }

  private static validateHour(hour: number): void {
    if (hour < 0 || hour > 23) {
      throw new InvalidMissionScheduleHourError(hour)
    }
  }

  private static validateMinute(minute: number): void {
    if (minute < 0 || minute > 59) {
      throw new InvalidMissionScheduleMinuteError(minute)
    }
  }

  get id(): MissionScheduleId {
    return this._id
  }

  get missionId(): MissionId {
    return this._missionId
  }

  get robotDogId(): RobotDogId {
    return this._robotDogId
  }

  get daysOfWeek(): number[] {
    return [...this._daysOfWeek]
  }

  get hour(): number {
    return this._hour
  }

  get minute(): number {
    return this._minute
  }

  get enabled(): boolean {
    return this._enabled
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/domain/mission-schedule.spec.ts"`
Expected: PASS (8 tests passing)

- [ ] **Step 7: Commit**

```bash
git add app/modules/missions/domain/value-objects/mission-schedule-id.ts \
        app/modules/missions/domain/exceptions/invalid-mission-schedule-id.error.ts \
        app/modules/missions/domain/exceptions/invalid-mission-schedule-days-of-week.error.ts \
        app/modules/missions/domain/exceptions/invalid-mission-schedule-hour.error.ts \
        app/modules/missions/domain/exceptions/invalid-mission-schedule-minute.error.ts \
        app/modules/missions/domain/entities/mission-schedule.entity.ts \
        tests/unit/mission/domain/mission-schedule.spec.ts
git commit -m "feat: add MissionSchedule domain entity with weekly recurrence predicate"
```

---

### Task 3: Domain — repository contract and fake test double

**Files:**
- Create: `app/modules/missions/domain/contracts/mission-schedule.repository.ts`
- Create: `app/modules/missions/domain/exceptions/mission-schedule-not-found.error.ts`
- Create: `tests/unit/fakes/fake-mission-schedule-repository.ts`
- Test: `tests/unit/fakes/fake-mission-schedule-repository.spec.ts`

**Interfaces:**
- Consumes: `MissionSchedule` (Task 2), `MissionScheduleId` (Task 2).
- Produces: abstract class `MissionScheduleRepository` with `findById(id: MissionScheduleId): Promise<MissionSchedule | null>`, `findByMission(missionId: string): Promise<MissionSchedule[]>`, `save(schedule: MissionSchedule): Promise<void>`, `delete(id: MissionScheduleId): Promise<void>`. `FakeMissionScheduleRepository` implements it in-memory. Used by Tasks 4–8 (use cases) and Task 9 (real implementation).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/fakes/fake-mission-schedule-repository.spec.ts
import { test } from '@japa/runner'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'

test.group('FakeMissionScheduleRepository', () => {
  test('saves, finds by id, finds by mission and deletes schedules', async ({ assert }) => {
    const repo = new FakeMissionScheduleRepository()
    const missionId = MissionId.generate()
    const robotDogId = RobotDogId.generate()

    const schedule = MissionSchedule.create(missionId, robotDogId, [2, 4], 16, 30)
    await repo.save(schedule)

    const found = await repo.findById(schedule.id)
    assert.isNotNull(found)
    assert.equal(found?.id.value, schedule.id.value)

    const byMission = await repo.findByMission(missionId.value)
    assert.lengthOf(byMission, 1)

    await repo.delete(schedule.id)
    assert.isNull(await repo.findById(schedule.id))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/fakes/fake-mission-schedule-repository.spec.ts"`
Expected: FAIL — `Cannot find module '#tests/unit/fakes/fake-mission-schedule-repository'`

- [ ] **Step 3: Write the contract**

```typescript
// app/modules/missions/domain/contracts/mission-schedule.repository.ts
import type MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { type MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'

export abstract class MissionScheduleRepository {
  abstract findById(id: MissionScheduleId): Promise<MissionSchedule | null>
  abstract findByMission(missionId: string): Promise<MissionSchedule[]>
  abstract save(schedule: MissionSchedule): Promise<void>
  abstract delete(id: MissionScheduleId): Promise<void>
}
```

- [ ] **Step 4: Write the not-found error**

```typescript
// app/modules/missions/domain/exceptions/mission-schedule-not-found.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionScheduleNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'MISSION_SCHEDULE_NOT_FOUND'

  constructor(scheduleId: string) {
    super(`Mission schedule with id ${scheduleId} was not found`)
  }
}
```

- [ ] **Step 5: Write the fake repository**

```typescript
// tests/unit/fakes/fake-mission-schedule-repository.ts
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { type MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { type MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'

export class FakeMissionScheduleRepository implements MissionScheduleRepository {
  public storedSchedules: MissionSchedule[] = []

  async findById(id: MissionScheduleId): Promise<MissionSchedule | null> {
    return this.storedSchedules.find((schedule) => schedule.id.equals(id)) ?? null
  }

  async findByMission(missionId: string): Promise<MissionSchedule[]> {
    return this.storedSchedules.filter((schedule) => schedule.missionId.value === missionId)
  }

  async save(schedule: MissionSchedule): Promise<void> {
    const index = this.storedSchedules.findIndex((existing) => existing.id.equals(schedule.id))
    if (index >= 0) {
      this.storedSchedules[index] = schedule
    } else {
      this.storedSchedules.push(schedule)
    }
  }

  async delete(id: MissionScheduleId): Promise<void> {
    this.storedSchedules = this.storedSchedules.filter((schedule) => !schedule.id.equals(id))
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node ace test --files="tests/unit/fakes/fake-mission-schedule-repository.spec.ts"`
Expected: PASS (1 test passing)

- [ ] **Step 7: Commit**

```bash
git add app/modules/missions/domain/contracts/mission-schedule.repository.ts \
        app/modules/missions/domain/exceptions/mission-schedule-not-found.error.ts \
        tests/unit/fakes/fake-mission-schedule-repository.ts \
        tests/unit/fakes/fake-mission-schedule-repository.spec.ts
git commit -m "feat: add MissionScheduleRepository contract and in-memory fake"
```

---

### Task 4: Application — `CreateMissionScheduleUseCase`

**Files:**
- Create: `app/modules/missions/application/dto/create-mission-schedule.dto.ts`
- Create: `app/modules/missions/application/usecases/create-mission-schedule.use-case.ts`
- Test: `tests/unit/mission/application/create-mission-schedule.spec.ts`

**Interfaces:**
- Consumes: `MissionScheduleRepository` (Task 3), `MissionRepository.isAssignedToDog(missionId: string, robotDogId: string): Promise<boolean>` (existing, `#app/modules/missions/domain/contracts/mission.repository`), `MissionNotAssignedToRobotError` (existing).
- Produces: `CreateMissionScheduleDto(missionId: string, robotDogId: string, daysOfWeek: number[], hour: number, minute: number)`; `CreateMissionScheduleUseCase.execute(dto): Promise<{ id: string }>`. Used by Task 12 (controller).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/application/create-mission-schedule.spec.ts
import { test } from '@japa/runner'
import { CreateMissionScheduleUseCase } from '#app/modules/missions/application/usecases/create-mission-schedule.use-case'
import { CreateMissionScheduleDto } from '#app/modules/missions/application/dto/create-mission-schedule.dto'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('CreateMissionScheduleUseCase', (group) => {
  let scheduleRepo: FakeMissionScheduleRepository
  let missionRepo: FakeMissionRepository
  let useCase: CreateMissionScheduleUseCase

  group.each.setup(() => {
    scheduleRepo = new FakeMissionScheduleRepository()
    missionRepo = new FakeMissionRepository()
    useCase = new CreateMissionScheduleUseCase(scheduleRepo, missionRepo)
  })

  test('creates a schedule when the mission is assigned to the target robot', async ({
    assert,
  }) => {
    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)

    const dogId = RobotDogId.generate().value
    await missionRepo.assignToDog(mission.id.value, dogId)

    const result = await useCase.execute(
      new CreateMissionScheduleDto(mission.id.value, dogId, [2, 4], 16, 30)
    )

    assert.isString(result.id)
    const stored = await scheduleRepo.findByMission(mission.id.value)
    assert.lengthOf(stored, 1)
    assert.deepEqual(stored[0].daysOfWeek, [2, 4])
  })

  test('rejects when the mission is not assigned to the target robot', async ({ assert }) => {
    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)

    const dogId = RobotDogId.generate().value

    await assert.rejects(
      () => useCase.execute(new CreateMissionScheduleDto(mission.id.value, dogId, [2, 4], 16, 30)),
      MissionNotAssignedToRobotError
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/application/create-mission-schedule.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/application/usecases/create-mission-schedule.use-case'`

- [ ] **Step 3: Write the DTO and use case**

```typescript
// app/modules/missions/application/dto/create-mission-schedule.dto.ts
export class CreateMissionScheduleDto {
  constructor(
    public readonly missionId: string,
    public readonly robotDogId: string,
    public readonly daysOfWeek: number[],
    public readonly hour: number,
    public readonly minute: number
  ) {}
}
```

```typescript
// app/modules/missions/application/usecases/create-mission-schedule.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { CreateMissionScheduleDto } from '#app/modules/missions/application/dto/create-mission-schedule.dto'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'

@inject()
export class CreateMissionScheduleUseCase {
  constructor(
    private missionScheduleRepository: MissionScheduleRepository,
    private missionRepository: MissionRepository
  ) {}

  async execute(dto: CreateMissionScheduleDto): Promise<{ id: string }> {
    logger.info('CreateMissionScheduleUseCase started', { dto })

    const isAssigned = await this.missionRepository.isAssignedToDog(dto.missionId, dto.robotDogId)
    if (!isAssigned) {
      throw new MissionNotAssignedToRobotError(dto.missionId, dto.robotDogId)
    }

    const schedule = MissionSchedule.create(
      MissionId.fromString(dto.missionId),
      RobotDogId.fromString(dto.robotDogId),
      dto.daysOfWeek,
      dto.hour,
      dto.minute
    )

    await this.missionScheduleRepository.save(schedule)

    return { id: schedule.id.value }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/create-mission-schedule.spec.ts"`
Expected: PASS (2 tests passing)

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/dto/create-mission-schedule.dto.ts \
        app/modules/missions/application/usecases/create-mission-schedule.use-case.ts \
        tests/unit/mission/application/create-mission-schedule.spec.ts
git commit -m "feat: add CreateMissionScheduleUseCase"
```

---

### Task 5: Application — `UpdateMissionScheduleUseCase`

**Files:**
- Create: `app/modules/missions/application/dto/update-mission-schedule.dto.ts`
- Create: `app/modules/missions/application/usecases/update-mission-schedule.use-case.ts`
- Test: `tests/unit/mission/application/update-mission-schedule.spec.ts`

**Interfaces:**
- Consumes: `MissionScheduleRepository` (Task 3), `MissionScheduleNotFoundError` (Task 3), `MissionSchedule.update()` (Task 2).
- Produces: `UpdateMissionScheduleDto(id: string, daysOfWeek: number[], hour: number, minute: number)`; `UpdateMissionScheduleUseCase.execute(dto): Promise<void>`. Used by Task 12.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/application/update-mission-schedule.spec.ts
import { test } from '@japa/runner'
import { UpdateMissionScheduleUseCase } from '#app/modules/missions/application/usecases/update-mission-schedule.use-case'
import { UpdateMissionScheduleDto } from '#app/modules/missions/application/dto/update-mission-schedule.dto'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

test.group('UpdateMissionScheduleUseCase', (group) => {
  let repo: FakeMissionScheduleRepository
  let useCase: UpdateMissionScheduleUseCase

  group.each.setup(() => {
    repo = new FakeMissionScheduleRepository()
    useCase = new UpdateMissionScheduleUseCase(repo)
  })

  test('updates days, hour and minute of an existing schedule', async ({ assert }) => {
    const schedule = MissionSchedule.create(MissionId.generate(), RobotDogId.generate(), [4], 12, 45)
    await repo.save(schedule)

    await useCase.execute(new UpdateMissionScheduleDto(schedule.id.value, [1, 3], 8, 0))

    const updated = await repo.findById(schedule.id)
    assert.deepEqual(updated?.daysOfWeek, [1, 3])
    assert.equal(updated?.hour, 8)
    assert.equal(updated?.minute, 0)
  })

  test('rejects when the schedule does not exist', async ({ assert }) => {
    await assert.rejects(
      () => useCase.execute(new UpdateMissionScheduleDto(MissionScheduleId.generate().value, [1], 8, 0)),
      MissionScheduleNotFoundError
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/application/update-mission-schedule.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/application/usecases/update-mission-schedule.use-case'`

- [ ] **Step 3: Write the DTO and use case**

```typescript
// app/modules/missions/application/dto/update-mission-schedule.dto.ts
export class UpdateMissionScheduleDto {
  constructor(
    public readonly id: string,
    public readonly daysOfWeek: number[],
    public readonly hour: number,
    public readonly minute: number
  ) {}
}
```

```typescript
// app/modules/missions/application/usecases/update-mission-schedule.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { UpdateMissionScheduleDto } from '#app/modules/missions/application/dto/update-mission-schedule.dto'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

@inject()
export class UpdateMissionScheduleUseCase {
  constructor(private missionScheduleRepository: MissionScheduleRepository) {}

  async execute(dto: UpdateMissionScheduleDto): Promise<void> {
    logger.info('UpdateMissionScheduleUseCase started', { dto })

    const scheduleId = MissionScheduleId.fromString(dto.id)
    const schedule = await this.missionScheduleRepository.findById(scheduleId)

    if (!schedule) {
      throw new MissionScheduleNotFoundError(dto.id)
    }

    schedule.update(dto.daysOfWeek, dto.hour, dto.minute)

    await this.missionScheduleRepository.save(schedule)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/update-mission-schedule.spec.ts"`
Expected: PASS (2 tests passing)

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/dto/update-mission-schedule.dto.ts \
        app/modules/missions/application/usecases/update-mission-schedule.use-case.ts \
        tests/unit/mission/application/update-mission-schedule.spec.ts
git commit -m "feat: add UpdateMissionScheduleUseCase"
```

---

### Task 6: Application — `ToggleMissionScheduleUseCase`

**Files:**
- Create: `app/modules/missions/application/dto/toggle-mission-schedule.dto.ts`
- Create: `app/modules/missions/application/usecases/toggle-mission-schedule.use-case.ts`
- Test: `tests/unit/mission/application/toggle-mission-schedule.spec.ts`

**Interfaces:**
- Consumes: `MissionScheduleRepository` (Task 3), `MissionScheduleNotFoundError` (Task 3), `MissionSchedule.enable()/disable()` (Task 2).
- Produces: `ToggleMissionScheduleDto(id: string, enabled: boolean)`; `ToggleMissionScheduleUseCase.execute(dto): Promise<void>`. Used by Task 12.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/application/toggle-mission-schedule.spec.ts
import { test } from '@japa/runner'
import { ToggleMissionScheduleUseCase } from '#app/modules/missions/application/usecases/toggle-mission-schedule.use-case'
import { ToggleMissionScheduleDto } from '#app/modules/missions/application/dto/toggle-mission-schedule.dto'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

test.group('ToggleMissionScheduleUseCase', (group) => {
  let repo: FakeMissionScheduleRepository
  let useCase: ToggleMissionScheduleUseCase

  group.each.setup(() => {
    repo = new FakeMissionScheduleRepository()
    useCase = new ToggleMissionScheduleUseCase(repo)
  })

  test('disables an enabled schedule', async ({ assert }) => {
    const schedule = MissionSchedule.create(MissionId.generate(), RobotDogId.generate(), [4], 12, 45)
    await repo.save(schedule)

    await useCase.execute(new ToggleMissionScheduleDto(schedule.id.value, false))

    const updated = await repo.findById(schedule.id)
    assert.isFalse(updated?.enabled)
  })

  test('re-enables a disabled schedule', async ({ assert }) => {
    const schedule = MissionSchedule.create(MissionId.generate(), RobotDogId.generate(), [4], 12, 45)
    schedule.disable()
    await repo.save(schedule)

    await useCase.execute(new ToggleMissionScheduleDto(schedule.id.value, true))

    const updated = await repo.findById(schedule.id)
    assert.isTrue(updated?.enabled)
  })

  test('rejects when the schedule does not exist', async ({ assert }) => {
    await assert.rejects(
      () => useCase.execute(new ToggleMissionScheduleDto(MissionScheduleId.generate().value, true)),
      MissionScheduleNotFoundError
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/application/toggle-mission-schedule.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/application/usecases/toggle-mission-schedule.use-case'`

- [ ] **Step 3: Write the DTO and use case**

```typescript
// app/modules/missions/application/dto/toggle-mission-schedule.dto.ts
export class ToggleMissionScheduleDto {
  constructor(
    public readonly id: string,
    public readonly enabled: boolean
  ) {}
}
```

```typescript
// app/modules/missions/application/usecases/toggle-mission-schedule.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { ToggleMissionScheduleDto } from '#app/modules/missions/application/dto/toggle-mission-schedule.dto'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

@inject()
export class ToggleMissionScheduleUseCase {
  constructor(private missionScheduleRepository: MissionScheduleRepository) {}

  async execute(dto: ToggleMissionScheduleDto): Promise<void> {
    logger.info('ToggleMissionScheduleUseCase started', { dto })

    const scheduleId = MissionScheduleId.fromString(dto.id)
    const schedule = await this.missionScheduleRepository.findById(scheduleId)

    if (!schedule) {
      throw new MissionScheduleNotFoundError(dto.id)
    }

    if (dto.enabled) {
      schedule.enable()
    } else {
      schedule.disable()
    }

    await this.missionScheduleRepository.save(schedule)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/toggle-mission-schedule.spec.ts"`
Expected: PASS (3 tests passing)

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/dto/toggle-mission-schedule.dto.ts \
        app/modules/missions/application/usecases/toggle-mission-schedule.use-case.ts \
        tests/unit/mission/application/toggle-mission-schedule.spec.ts
git commit -m "feat: add ToggleMissionScheduleUseCase"
```

---

### Task 7: Application — `DestroyMissionScheduleUseCase`

**Files:**
- Create: `app/modules/missions/application/dto/destroy-mission-schedule.dto.ts`
- Create: `app/modules/missions/application/usecases/destroy-mission-schedule.use-case.ts`
- Test: `tests/unit/mission/application/destroy-mission-schedule.spec.ts`

**Interfaces:**
- Consumes: `MissionScheduleRepository` (Task 3), `MissionScheduleNotFoundError` (Task 3).
- Produces: `DestroyMissionScheduleDto(id: string)`; `DestroyMissionScheduleUseCase.execute(dto): Promise<void>`. Used by Task 12.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/application/destroy-mission-schedule.spec.ts
import { test } from '@japa/runner'
import { DestroyMissionScheduleUseCase } from '#app/modules/missions/application/usecases/destroy-mission-schedule.use-case'
import { DestroyMissionScheduleDto } from '#app/modules/missions/application/dto/destroy-mission-schedule.dto'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

test.group('DestroyMissionScheduleUseCase', (group) => {
  let repo: FakeMissionScheduleRepository
  let useCase: DestroyMissionScheduleUseCase

  group.each.setup(() => {
    repo = new FakeMissionScheduleRepository()
    useCase = new DestroyMissionScheduleUseCase(repo)
  })

  test('deletes an existing schedule', async ({ assert }) => {
    const schedule = MissionSchedule.create(MissionId.generate(), RobotDogId.generate(), [4], 12, 45)
    await repo.save(schedule)

    await useCase.execute(new DestroyMissionScheduleDto(schedule.id.value))

    assert.isNull(await repo.findById(schedule.id))
  })

  test('rejects when the schedule does not exist', async ({ assert }) => {
    await assert.rejects(
      () => useCase.execute(new DestroyMissionScheduleDto(MissionScheduleId.generate().value)),
      MissionScheduleNotFoundError
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/application/destroy-mission-schedule.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/application/usecases/destroy-mission-schedule.use-case'`

- [ ] **Step 3: Write the DTO and use case**

```typescript
// app/modules/missions/application/dto/destroy-mission-schedule.dto.ts
export class DestroyMissionScheduleDto {
  constructor(public readonly id: string) {}
}
```

```typescript
// app/modules/missions/application/usecases/destroy-mission-schedule.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { DestroyMissionScheduleDto } from '#app/modules/missions/application/dto/destroy-mission-schedule.dto'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

@inject()
export class DestroyMissionScheduleUseCase {
  constructor(private missionScheduleRepository: MissionScheduleRepository) {}

  async execute(dto: DestroyMissionScheduleDto): Promise<void> {
    logger.info('DestroyMissionScheduleUseCase started', { dto })

    const scheduleId = MissionScheduleId.fromString(dto.id)
    const schedule = await this.missionScheduleRepository.findById(scheduleId)

    if (!schedule) {
      throw new MissionScheduleNotFoundError(dto.id)
    }

    await this.missionScheduleRepository.delete(schedule.id)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/destroy-mission-schedule.spec.ts"`
Expected: PASS (2 tests passing)

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/dto/destroy-mission-schedule.dto.ts \
        app/modules/missions/application/usecases/destroy-mission-schedule.use-case.ts \
        tests/unit/mission/application/destroy-mission-schedule.spec.ts
git commit -m "feat: add DestroyMissionScheduleUseCase"
```

---

### Task 8: Application — `ListMissionSchedulesByMissionUseCase`

**Files:**
- Create: `app/modules/missions/application/usecases/list-mission-schedules-by-mission.use-case.ts`
- Test: `tests/unit/mission/application/list-mission-schedules-by-mission.spec.ts`

**Interfaces:**
- Consumes: `MissionScheduleRepository` (Task 3).
- Produces: `ListMissionSchedulesByMissionUseCase.execute(missionId: string): Promise<MissionSchedule[]>`. Used by Task 12.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/mission/application/list-mission-schedules-by-mission.spec.ts
import { test } from '@japa/runner'
import { ListMissionSchedulesByMissionUseCase } from '#app/modules/missions/application/usecases/list-mission-schedules-by-mission.use-case'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('ListMissionSchedulesByMissionUseCase', (group) => {
  let repo: FakeMissionScheduleRepository
  let useCase: ListMissionSchedulesByMissionUseCase

  group.each.setup(() => {
    repo = new FakeMissionScheduleRepository()
    useCase = new ListMissionSchedulesByMissionUseCase(repo)
  })

  test('returns only schedules linked to the requested mission', async ({ assert }) => {
    const missionA = MissionId.generate()
    const missionB = MissionId.generate()

    await repo.save(MissionSchedule.create(missionA, RobotDogId.generate(), [1], 8, 0))
    await repo.save(MissionSchedule.create(missionA, RobotDogId.generate(), [2, 4], 16, 30))
    await repo.save(MissionSchedule.create(missionB, RobotDogId.generate(), [5], 9, 15))

    const result = await useCase.execute(missionA.value)

    assert.lengthOf(result, 2)
  })

  test('returns an empty list when the mission has no schedule', async ({ assert }) => {
    const result = await useCase.execute(MissionId.generate().value)
    assert.lengthOf(result, 0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/application/list-mission-schedules-by-mission.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/application/usecases/list-mission-schedules-by-mission.use-case'`

- [ ] **Step 3: Write the use case**

```typescript
// app/modules/missions/application/usecases/list-mission-schedules-by-mission.use-case.ts
import { inject } from '@adonisjs/core'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import type MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'

@inject()
export class ListMissionSchedulesByMissionUseCase {
  constructor(private missionScheduleRepository: MissionScheduleRepository) {}

  async execute(missionId: string): Promise<MissionSchedule[]> {
    return this.missionScheduleRepository.findByMission(missionId)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/list-mission-schedules-by-mission.spec.ts"`
Expected: PASS (2 tests passing)

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/usecases/list-mission-schedules-by-mission.use-case.ts \
        tests/unit/mission/application/list-mission-schedules-by-mission.spec.ts
git commit -m "feat: add ListMissionSchedulesByMissionUseCase"
```

---

### Task 9: Infrastructure — Lucid model and repository implementation

**Files:**
- Create: `app/modules/missions/infrastructure/database/models/mission-schedule.ts`
- Create: `app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation.ts`
- Test: `tests/functional/missions/mission-schedule-repository.spec.ts`

**Interfaces:**
- Consumes: `mission_schedules` table (Task 1), `MissionScheduleRepository` contract (Task 3), `MissionSchedule` entity (Task 2).
- Produces: `MissionScheduleModel` (Lucid model), `MissionScheduleRepositoryImplementation implements MissionScheduleRepository`. Used by Task 10 (DI wiring).

- [ ] **Step 1: Write the failing test**

This is an integration test against the real database (matching the existing pattern in `tests/functional/missions/one-active-run-per-dog.spec.ts`) — it is the concrete proof that the native Postgres `smallint[]` column round-trips correctly through Lucid.

```typescript
// tests/functional/missions/mission-schedule-repository.spec.ts
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionScheduleRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('MissionScheduleRepositoryImplementation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('round-trips days of week through the native postgres array column', async ({
    assert,
  }) => {
    const repo = new MissionScheduleRepositoryImplementation()

    const user = await UserModel.create({
      firebaseUid: 'firebase-uid-mission-schedule',
      firstname: 'Test',
      lastname: 'User',
      email: 'mission-schedule@example.com',
      role: UserRole.USER,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-MISSION-SCHEDULE-001',
      key: 'MissionScheduleDogKey123',
      name: 'PatrolDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: user.id,
    })

    const schedule = MissionSchedule.create(
      MissionId.fromString(mission.id),
      RobotDogId.fromString(dog.id),
      [4, 2],
      16,
      30
    )

    await repo.save(schedule)

    const found = await repo.findById(schedule.id)
    assert.isNotNull(found)
    assert.deepEqual(found?.daysOfWeek, [2, 4])
    assert.equal(found?.hour, 16)
    assert.equal(found?.minute, 30)
    assert.isTrue(found?.enabled)

    const byMission = await repo.findByMission(mission.id)
    assert.lengthOf(byMission, 1)

    await repo.delete(schedule.id)
    assert.isNull(await repo.findById(schedule.id))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/functional/missions/mission-schedule-repository.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation'`

- [ ] **Step 3: Write the Lucid model**

```typescript
// app/modules/missions/infrastructure/database/models/mission-schedule.ts
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class MissionScheduleModel extends BaseModel {
  public static table = 'mission_schedules'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare missionId: string

  @column()
  declare robotDogId: string

  @column()
  declare daysOfWeek: number[]

  @column()
  declare hour: number

  @column()
  declare minute: number

  @column()
  declare enabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

- [ ] **Step 4: Write the repository implementation**

```typescript
// app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation.ts
import { type MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import MissionScheduleModel from '#app/modules/missions/infrastructure/database/models/mission-schedule'
import { type MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'

export class MissionScheduleRepositoryImplementation implements MissionScheduleRepository {
  private toDomain(row: MissionScheduleModel): MissionSchedule {
    return MissionSchedule.rehydrate(
      row.id,
      row.missionId,
      row.robotDogId,
      row.daysOfWeek,
      row.hour,
      row.minute,
      row.enabled
    )
  }

  async findById(id: MissionScheduleId): Promise<MissionSchedule | null> {
    const row = await MissionScheduleModel.find(id.value)
    return row ? this.toDomain(row) : null
  }

  async findByMission(missionId: string): Promise<MissionSchedule[]> {
    const rows = await MissionScheduleModel.query()
      .where('mission_id', missionId)
      .orderBy('created_at', 'asc')

    return rows.map((row) => this.toDomain(row))
  }

  async save(schedule: MissionSchedule): Promise<void> {
    await MissionScheduleModel.updateOrCreate(
      { id: schedule.id.value },
      {
        missionId: schedule.missionId.value,
        robotDogId: schedule.robotDogId.value,
        daysOfWeek: schedule.daysOfWeek,
        hour: schedule.hour,
        minute: schedule.minute,
        enabled: schedule.enabled,
      }
    )
  }

  async delete(id: MissionScheduleId): Promise<void> {
    const row = await MissionScheduleModel.find(id.value)
    if (row) {
      await row.delete()
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ace test --files="tests/functional/missions/mission-schedule-repository.spec.ts"`
Expected: PASS (1 test passing). If it fails on the array column with a type error, check that the migration from Task 1 was actually applied (`node ace migration:status`).

- [ ] **Step 6: Commit**

```bash
git add app/modules/missions/infrastructure/database/models/mission-schedule.ts \
        app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation.ts \
        tests/functional/missions/mission-schedule-repository.spec.ts
git commit -m "feat: add MissionScheduleModel and Lucid-backed repository implementation"
```

---

### Task 10: Infrastructure — DI wiring

**Files:**
- Modify: `providers/mission_provider.ts`

**Interfaces:**
- Consumes: `MissionScheduleRepository` (Task 3), `MissionScheduleRepositoryImplementation` (Task 9).
- Produces: container binding resolvable via `app.container.make(MissionScheduleRepository)`. Used implicitly by every use case in Tasks 4–8 once wired into HTTP controllers (Task 12).

- [ ] **Step 1: Add the binding**

```typescript
// providers/mission_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission.repository.implementation'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionScheduleRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation'
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

- [ ] **Step 2: Verify the binding resolves and the full test suite still passes**

Run: `node ace test`
Expected: PASS — all existing tests plus the ones added in Tasks 2–9 pass (this also indirectly proves the container can resolve `MissionScheduleRepository`, since Task 9's functional test exercises the real implementation directly, and Task 12 will exercise it through the container).

- [ ] **Step 3: Commit**

```bash
git add providers/mission_provider.ts
git commit -m "feat: register MissionScheduleRepository in MissionProvider"
```

---

### Task 11: HTTP — validators and transformer

**Files:**
- Create: `app/modules/missions/infrastructure/http/validators/create-mission-schedule.validator.ts`
- Create: `app/modules/missions/infrastructure/http/validators/update-mission-schedule.validator.ts`
- Create: `app/modules/missions/infrastructure/http/validators/toggle-mission-schedule.validator.ts`
- Create: `app/modules/missions/infrastructure/http/transformers/mission-schedule.transformer.ts`
- Test: `tests/unit/mission/http/mission-schedule-validators.spec.ts`

**Interfaces:**
- Consumes: `MissionSchedule` entity (Task 2, for the transformer's input type).
- Produces: `CreateMissionScheduleValidator`, `UpdateMissionScheduleValidator`, `ToggleMissionScheduleValidator` (VineJS validators, each with a `.validate(data)` method); `MissionScheduleTransformer` (with static `.transform(resource | resource[])`). Used by Task 12 (controllers).

- [ ] **Step 1: Write the failing test**

VineJS validators run standalone (no HTTP request needed), so they're testable directly:

```typescript
// tests/unit/mission/http/mission-schedule-validators.spec.ts
import { test } from '@japa/runner'
import { CreateMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/create-mission-schedule.validator'
import { ToggleMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/toggle-mission-schedule.validator'

test.group('CreateMissionScheduleValidator', () => {
  test('accepts a valid payload', async ({ assert }) => {
    const payload = await CreateMissionScheduleValidator.validate({
      robotDogId: '8570f711-2895-4632-9599-281083096058',
      daysOfWeek: [2, 4],
      hour: 16,
      minute: 30,
    })

    assert.deepEqual(payload.daysOfWeek, [2, 4])
  })

  test('rejects an empty days of week list', async ({ assert }) => {
    await assert.rejects(() =>
      CreateMissionScheduleValidator.validate({
        robotDogId: '8570f711-2895-4632-9599-281083096058',
        daysOfWeek: [],
        hour: 16,
        minute: 30,
      })
    )
  })

  test('rejects an out-of-range hour', async ({ assert }) => {
    await assert.rejects(() =>
      CreateMissionScheduleValidator.validate({
        robotDogId: '8570f711-2895-4632-9599-281083096058',
        daysOfWeek: [2],
        hour: 24,
        minute: 0,
      })
    )
  })
})

test.group('ToggleMissionScheduleValidator', () => {
  test('accepts a boolean enabled flag', async ({ assert }) => {
    const payload = await ToggleMissionScheduleValidator.validate({ enabled: false })
    assert.isFalse(payload.enabled)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/http/mission-schedule-validators.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/missions/infrastructure/http/validators/create-mission-schedule.validator'`

- [ ] **Step 3: Write the validators**

```typescript
// app/modules/missions/infrastructure/http/validators/create-mission-schedule.validator.ts
import vine from '@vinejs/vine'

export const CreateMissionScheduleValidator = vine.create({
  robotDogId: vine.string().uuid(),
  daysOfWeek: vine.array(vine.number().min(1).max(7)).minLength(1),
  hour: vine.number().min(0).max(23),
  minute: vine.number().min(0).max(59),
})
```

```typescript
// app/modules/missions/infrastructure/http/validators/update-mission-schedule.validator.ts
import vine from '@vinejs/vine'

export const UpdateMissionScheduleValidator = vine.create({
  daysOfWeek: vine.array(vine.number().min(1).max(7)).minLength(1),
  hour: vine.number().min(0).max(23),
  minute: vine.number().min(0).max(59),
})
```

```typescript
// app/modules/missions/infrastructure/http/validators/toggle-mission-schedule.validator.ts
import vine from '@vinejs/vine'

export const ToggleMissionScheduleValidator = vine.create({
  enabled: vine.boolean(),
})
```

- [ ] **Step 4: Write the transformer**

```typescript
// app/modules/missions/infrastructure/http/transformers/mission-schedule.transformer.ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'

export default class MissionScheduleTransformer extends BaseTransformer<MissionSchedule> {
  toObject() {
    return {
      id: this.resource.id.value,
      missionId: this.resource.missionId.value,
      robotDogId: this.resource.robotDogId.value,
      daysOfWeek: this.resource.daysOfWeek,
      hour: this.resource.hour,
      minute: this.resource.minute,
      enabled: this.resource.enabled,
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/http/mission-schedule-validators.spec.ts"`
Expected: PASS (4 tests passing)

- [ ] **Step 6: Commit**

```bash
git add app/modules/missions/infrastructure/http/validators/create-mission-schedule.validator.ts \
        app/modules/missions/infrastructure/http/validators/update-mission-schedule.validator.ts \
        app/modules/missions/infrastructure/http/validators/toggle-mission-schedule.validator.ts \
        app/modules/missions/infrastructure/http/transformers/mission-schedule.transformer.ts \
        tests/unit/mission/http/mission-schedule-validators.spec.ts
git commit -m "feat: add mission schedule validators and transformer"
```

---

### Task 12: HTTP — policy, controllers and routes

**Files:**
- Modify: `app/modules/missions/application/policies/mission.policy.ts`
- Create: `app/modules/missions/infrastructure/http/controllers/create-mission-schedule.controller.ts`
- Create: `app/modules/missions/infrastructure/http/controllers/list-mission-schedules.controller.ts`
- Create: `app/modules/missions/infrastructure/http/controllers/update-mission-schedule.controller.ts`
- Create: `app/modules/missions/infrastructure/http/controllers/toggle-mission-schedule.controller.ts`
- Create: `app/modules/missions/infrastructure/http/controllers/destroy-mission-schedule.controller.ts`
- Modify: `app/modules/missions/infrastructure/http/routes.v1.ts`

**Interfaces:**
- Consumes: all use cases from Tasks 4–8, validators and transformer from Task 11, `MissionRepository.isOwner` (existing).
- Produces: five new HTTP routes under `/api/v1/missions`.

- [ ] **Step 1: Add policy checks**

Add these two methods to the existing `MissionPolicy` class in `app/modules/missions/application/policies/mission.policy.ts` (alongside the existing `create`, `update`, `destroy`, etc. methods — no constructor changes needed, it already injects `MissionRepository`):

```typescript
  async createSchedule(user: User, missionId: string): Promise<AuthorizerResponse> {
    return this.missionRepository.isOwner(user.id, missionId)
  }

  async manageSchedule(user: User, missionId: string): Promise<AuthorizerResponse> {
    return this.missionRepository.isOwner(user.id, missionId)
  }
```

- [ ] **Step 2: Write the controllers**

```typescript
// app/modules/missions/infrastructure/http/controllers/create-mission-schedule.controller.ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { CreateMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/create-mission-schedule.validator'
import { CreateMissionScheduleUseCase } from '#app/modules/missions/application/usecases/create-mission-schedule.use-case'
import { CreateMissionScheduleDto } from '#app/modules/missions/application/dto/create-mission-schedule.dto'

@inject()
export default class CreateMissionScheduleController {
  constructor(private createUseCase: CreateMissionScheduleUseCase) {}

  public async handle({ request, response, params, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('createSchedule', params.id)

    const payload = await request.validateUsing(CreateMissionScheduleValidator)
    const result = await this.createUseCase.execute(
      new CreateMissionScheduleDto(
        params.id,
        payload.robotDogId,
        payload.daysOfWeek,
        payload.hour,
        payload.minute
      )
    )

    return response.status(201).json({ id: result.id })
  }
}
```

```typescript
// app/modules/missions/infrastructure/http/controllers/list-mission-schedules.controller.ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ListMissionSchedulesByMissionUseCase } from '#app/modules/missions/application/usecases/list-mission-schedules-by-mission.use-case'
import MissionScheduleTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-schedule.transformer'

@inject()
export default class ListMissionSchedulesController {
  constructor(private listUseCase: ListMissionSchedulesByMissionUseCase) {}

  public async handle({ params, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('manageSchedule', params.id)

    const schedules = await this.listUseCase.execute(params.id)

    return response.ok(MissionScheduleTransformer.transform(schedules))
  }
}
```

```typescript
// app/modules/missions/infrastructure/http/controllers/update-mission-schedule.controller.ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { UpdateMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/update-mission-schedule.validator'
import { UpdateMissionScheduleUseCase } from '#app/modules/missions/application/usecases/update-mission-schedule.use-case'
import { UpdateMissionScheduleDto } from '#app/modules/missions/application/dto/update-mission-schedule.dto'

@inject()
export default class UpdateMissionScheduleController {
  constructor(private updateUseCase: UpdateMissionScheduleUseCase) {}

  public async handle({ request, params, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('manageSchedule', params.missionId)

    const payload = await request.validateUsing(UpdateMissionScheduleValidator)
    await this.updateUseCase.execute(
      new UpdateMissionScheduleDto(
        params.scheduleId,
        payload.daysOfWeek,
        payload.hour,
        payload.minute
      )
    )

    return response.ok({ message: 'Mission schedule updated successfully' })
  }
}
```

```typescript
// app/modules/missions/infrastructure/http/controllers/toggle-mission-schedule.controller.ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ToggleMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/toggle-mission-schedule.validator'
import { ToggleMissionScheduleUseCase } from '#app/modules/missions/application/usecases/toggle-mission-schedule.use-case'
import { ToggleMissionScheduleDto } from '#app/modules/missions/application/dto/toggle-mission-schedule.dto'

@inject()
export default class ToggleMissionScheduleController {
  constructor(private toggleUseCase: ToggleMissionScheduleUseCase) {}

  public async handle({ request, params, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('manageSchedule', params.missionId)

    const payload = await request.validateUsing(ToggleMissionScheduleValidator)
    await this.toggleUseCase.execute(
      new ToggleMissionScheduleDto(params.scheduleId, payload.enabled)
    )

    return response.ok({ message: 'Mission schedule toggled successfully' })
  }
}
```

```typescript
// app/modules/missions/infrastructure/http/controllers/destroy-mission-schedule.controller.ts
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DestroyMissionScheduleUseCase } from '#app/modules/missions/application/usecases/destroy-mission-schedule.use-case'
import { DestroyMissionScheduleDto } from '#app/modules/missions/application/dto/destroy-mission-schedule.dto'

@inject()
export default class DestroyMissionScheduleController {
  constructor(private destroyUseCase: DestroyMissionScheduleUseCase) {}

  public async handle({ params, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('manageSchedule', params.missionId)

    await this.destroyUseCase.execute(new DestroyMissionScheduleDto(params.scheduleId))

    return response.status(200)
  }
}
```

- [ ] **Step 3: Wire the routes**

Add these lazy imports near the top of `app/modules/missions/infrastructure/http/routes.v1.ts` (alongside the existing ones):

```typescript
const CreateMissionScheduleController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/create-mission-schedule.controller')
const ListMissionSchedulesController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/list-mission-schedules.controller')
const UpdateMissionScheduleController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/update-mission-schedule.controller')
const ToggleMissionScheduleController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/toggle-mission-schedule.controller')
const DestroyMissionScheduleController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/destroy-mission-schedule.controller')
```

Add these routes inside the existing `router.group(() => { ... }).prefix('/api/v1/missions')` block, after the mission-steps routes:

```typescript
    router.post('/:id/schedules', [CreateMissionScheduleController])
    router.get('/:id/schedules', [ListMissionSchedulesController])
    router.put('/:missionId/schedules/:scheduleId', [UpdateMissionScheduleController])
    router.patch('/:missionId/schedules/:scheduleId/toggle', [ToggleMissionScheduleController])
    router.delete('/:missionId/schedules/:scheduleId', [DestroyMissionScheduleController])
```

- [ ] **Step 4: Verify the routes are registered**

Run: `node ace list:routes | grep schedules`
Expected: five lines listing `POST /api/v1/missions/:id/schedules`, `GET /api/v1/missions/:id/schedules`, `PUT /api/v1/missions/:missionId/schedules/:scheduleId`, `PATCH /api/v1/missions/:missionId/schedules/:scheduleId/toggle`, `DELETE /api/v1/missions/:missionId/schedules/:scheduleId`.

- [ ] **Step 5: Run the full test suite**

Run: `node ace test`
Expected: PASS — every test added across Tasks 2–11 plus all pre-existing tests pass, confirming nothing was broken by the policy/provider changes.

- [ ] **Step 6: Commit**

```bash
git add app/modules/missions/application/policies/mission.policy.ts \
        app/modules/missions/infrastructure/http/controllers/create-mission-schedule.controller.ts \
        app/modules/missions/infrastructure/http/controllers/list-mission-schedules.controller.ts \
        app/modules/missions/infrastructure/http/controllers/update-mission-schedule.controller.ts \
        app/modules/missions/infrastructure/http/controllers/toggle-mission-schedule.controller.ts \
        app/modules/missions/infrastructure/http/controllers/destroy-mission-schedule.controller.ts \
        app/modules/missions/infrastructure/http/routes.v1.ts
git commit -m "feat: expose mission schedule CRUD over HTTP"
```

---

## What this plan deliberately does not cover

- No automatic triggering: `MissionSchedule.isDueAt()` exists but nothing calls it yet.
- No `mission_schedule_firings` table, no BullMQ tick/dispatch queues, no workers — that's the next plan, per `docs/superpowers/specs/2026-07-13-mission-scheduler-design.md`.
- No frontend.
