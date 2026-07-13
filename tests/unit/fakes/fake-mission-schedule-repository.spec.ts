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
})
