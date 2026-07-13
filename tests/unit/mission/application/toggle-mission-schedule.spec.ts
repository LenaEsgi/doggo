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
