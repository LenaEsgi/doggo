import { test } from '@japa/runner'
import { CreateMissionScheduleUseCase } from '#app/modules/missions/application/usecases/create-mission-schedule.use-case'
import { CreateMissionScheduleDto } from '#app/modules/missions/application/dto/create-mission-schedule.dto'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeRobotDogGateway } from '#tests/unit/fakes/fake-robot-dog-gateway'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { MissionFirmwareCompatibilityService } from '#app/modules/missions/application/services/mission-firmware-compatibility.service'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('CreateMissionScheduleUseCase', (group) => {
  let scheduleRepo: FakeMissionScheduleRepository
  let missionRepo: FakeMissionRepository
  let dogGateway: FakeRobotDogGateway
  let actionRepo: FakeActionRepository
  let useCase: CreateMissionScheduleUseCase

  group.each.setup(() => {
    scheduleRepo = new FakeMissionScheduleRepository()
    missionRepo = new FakeMissionRepository()
    dogGateway = new FakeRobotDogGateway()
    actionRepo = new FakeActionRepository()
    useCase = new CreateMissionScheduleUseCase(
      scheduleRepo,
      missionRepo,
      dogGateway,
      new MissionFirmwareCompatibilityService(actionRepo)
    )
  })

  test('creates a schedule when the mission is assigned to the target robot', async ({
    assert,
  }) => {
    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)

    const dogId = RobotDogId.generate().value
    await missionRepo.assignToDog(mission.id.value, dogId)
    dogGateway.addRobot(dogId)

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

  test('rejects when the robot firmware does not support an action of the mission', async ({
    assert,
  }) => {
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(bark.id.value, '{}', false)
    await missionRepo.save(mission)

    const dogId = RobotDogId.generate().value
    await missionRepo.assignToDog(mission.id.value, dogId)
    dogGateway.addRobot(dogId, 'Rex', '1.0.0')

    await assert.rejects(
      () => useCase.execute(new CreateMissionScheduleDto(mission.id.value, dogId, [2, 4], 16, 30)),
      IncompatibleRobotActionsError
    )

    const stored = await scheduleRepo.findByMission(mission.id.value)
    assert.lengthOf(stored, 0)
  })

  test('creates the schedule when the robot firmware satisfies all mission actions', async ({
    assert,
  }) => {
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(bark.id.value, '{}', false)
    await missionRepo.save(mission)

    const dogId = RobotDogId.generate().value
    await missionRepo.assignToDog(mission.id.value, dogId)
    dogGateway.addRobot(dogId, 'Rex', '2.0.0')

    const result = await useCase.execute(
      new CreateMissionScheduleDto(mission.id.value, dogId, [2, 4], 16, 30)
    )

    assert.isString(result.id)
  })
})
