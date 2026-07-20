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

    await repo.recordOutcome(
      scheduleId,
      firedForMinute,
      MissionScheduleFiringOutcome.DISPATCHED,
      runId
    )

    assert.lengthOf(repo.outcomes, 1)
    assert.equal(repo.outcomes[0].missionScheduleId, scheduleId)
    assert.equal(repo.outcomes[0].outcome, MissionScheduleFiringOutcome.DISPATCHED)
    assert.equal(repo.outcomes[0].missionRunId, runId)
  })
})
