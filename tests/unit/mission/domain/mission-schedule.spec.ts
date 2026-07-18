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
