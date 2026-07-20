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
    const missionId = MissionId.generate()
    const schedule = MissionSchedule.create(missionId, RobotDogId.generate(), [4], 12, 45)
    await repo.save(schedule)

    await useCase.execute(
      new UpdateMissionScheduleDto(schedule.id.value, missionId.value, [1, 3], 8, 0)
    )

    const updated = await repo.findById(schedule.id)
    assert.deepEqual(updated?.daysOfWeek, [1, 3])
    assert.equal(updated?.hour, 8)
    assert.equal(updated?.minute, 0)
  })

  test('rejects when the schedule does not exist', async ({ assert }) => {
    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateMissionScheduleDto(
            MissionScheduleId.generate().value,
            MissionId.generate().value,
            [1],
            8,
            0
          )
        ),
      MissionScheduleNotFoundError
    )
  })

  test('rejects when the schedule belongs to a different mission', async ({ assert }) => {
    const schedule = MissionSchedule.create(
      MissionId.generate(),
      RobotDogId.generate(),
      [4],
      12,
      45
    )
    await repo.save(schedule)

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateMissionScheduleDto(schedule.id.value, MissionId.generate().value, [1, 3], 8, 0)
        ),
      MissionScheduleNotFoundError
    )
  })
})
