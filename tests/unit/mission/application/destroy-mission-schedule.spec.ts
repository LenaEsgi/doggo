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
    const missionId = MissionId.generate()
    const schedule = MissionSchedule.create(missionId, RobotDogId.generate(), [4], 12, 45)
    await repo.save(schedule)

    await useCase.execute(new DestroyMissionScheduleDto(schedule.id.value, missionId.value))

    assert.isNull(await repo.findById(schedule.id))
  })

  test('rejects when the schedule does not exist', async ({ assert }) => {
    await assert.rejects(
      () =>
        useCase.execute(
          new DestroyMissionScheduleDto(MissionScheduleId.generate().value, MissionId.generate().value)
        ),
      MissionScheduleNotFoundError
    )
  })

  test('rejects when the schedule belongs to a different mission', async ({ assert }) => {
    const schedule = MissionSchedule.create(MissionId.generate(), RobotDogId.generate(), [4], 12, 45)
    await repo.save(schedule)

    await assert.rejects(
      () =>
        useCase.execute(new DestroyMissionScheduleDto(schedule.id.value, MissionId.generate().value)),
      MissionScheduleNotFoundError
    )

    assert.isNotNull(await repo.findById(schedule.id))
  })
})
