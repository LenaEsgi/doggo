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
