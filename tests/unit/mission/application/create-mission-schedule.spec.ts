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
