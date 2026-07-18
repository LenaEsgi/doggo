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
