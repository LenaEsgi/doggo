import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeRobotDogGateway } from '#tests/unit/fakes/fake-robot-dog-gateway'
import { AssignMissionToDogUseCase } from '#app/modules/missions/application/usecases/assign-mission-to-dog.use-case'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { RobotAlreadyAssignedError } from '#app/modules/missions/domain/exceptions/robot-already-assigned.error'
import MissionAssignedToDogEvent from '#app/modules/missions/domain/events/mission-assigned-to-dog.event'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import Action from '#app/modules/actions/domain/action.entity'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'

test.group('AssignMissionToDogUseCase', (group) => {
  let repo: FakeMissionRepository
  let dogGateway: FakeRobotDogGateway
  let actionRepo: FakeActionRepository
  let useCase: AssignMissionToDogUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    repo = new FakeMissionRepository()
    dogGateway = new FakeRobotDogGateway()
    actionRepo = new FakeActionRepository()
    useCase = new AssignMissionToDogUseCase(repo, dogGateway, actionRepo)
    events = emitter.fake()
    return () => emitter.restore()
  })

  test('émet MissionAssignedToDogEvent pour notifier tous les propriétaires du robot', async () => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    dogGateway.addRobot(dogId, 'Rex')

    await useCase.execute(mission.id.value, dogId)

    events.assertEmitted(
      MissionAssignedToDogEvent,
      ({ data }) =>
        data.missionId === mission.id.value &&
        data.missionName === 'Bridge patrol' &&
        data.robotDogId === dogId &&
        data.robotDogName === 'Rex'
    )
  })

  test('should assign mission to robot dog when both exist', async ({ assert }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    dogGateway.addRobot(dogId)

    await useCase.execute(mission.id.value, dogId)

    const result = await repo.listByRobotDog(dogId, { page: 1, limit: 10 })
    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].id.value, mission.id.value)
  })

  test('should throw RobotAlreadyAssignedError when assigning the same robot twice', async ({
    assert,
  }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    dogGateway.addRobot(dogId)

    await useCase.execute(mission.id.value, dogId)

    await assert.rejects(() => useCase.execute(mission.id.value, dogId), RobotAlreadyAssignedError)
  })

  test('should allow the same mission to be assigned to two different robots', async ({
    assert,
  }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogA = '8570f711-2895-4632-9599-281083096058'
    const dogB = 'a1c1b6c2-4e2a-4b0b-9c3d-9f3a1e2d4c5b'

    await repo.save(mission)
    dogGateway.addRobot(dogA)
    dogGateway.addRobot(dogB)

    await useCase.execute(mission.id.value, dogA)
    await useCase.execute(mission.id.value, dogB)

    const resultA = await repo.listByRobotDog(dogA, { page: 1, limit: 10 })
    const resultB = await repo.listByRobotDog(dogB, { page: 1, limit: 10 })
    assert.lengthOf(resultA.data, 1)
    assert.lengthOf(resultB.data, 1)
  })

  test('should reject assignment when robot firmware is below an action minFirmwareVersion', async ({
    assert,
  }) => {
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)

    const mission = Mission.create('Bridge patrol', 'user-1')
    mission.addStep(bark.id.value, '{}', false)
    await repo.save(mission)

    const dogId = '8570f711-2895-4632-9599-281083096058'
    dogGateway.addRobot(dogId, 'Rex', '1.0.0')

    let error: unknown
    try {
      await useCase.execute(mission.id.value, dogId)
    } catch (e) {
      error = e
    }

    assert.instanceOf(error, IncompatibleRobotActionsError)
    assert.equal((error as IncompatibleRobotActionsError).details?.robotFirmwareVersion, '1.0.0')
    assert.deepEqual(
      (error as IncompatibleRobotActionsError).details?.actions,
      [{ code: 'BARK', name: 'Aboyer', minFirmwareVersion: '2.0.0' }]
    )
  })

  test('should allow assignment when robot firmware satisfies all action requirements', async ({
    assert,
  }) => {
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)

    const mission = Mission.create('Bridge patrol', 'user-1')
    mission.addStep(bark.id.value, '{}', false)
    await repo.save(mission)

    const dogId = '8570f711-2895-4632-9599-281083096058'
    dogGateway.addRobot(dogId, 'Rex', '2.0.0')

    await useCase.execute(mission.id.value, dogId)

    const result = await repo.listByRobotDog(dogId, { page: 1, limit: 10 })
    assert.lengthOf(result.data, 1)
  })

  test('should allow assignment when the action has no minFirmwareVersion restriction', async ({
    assert,
  }) => {
    const wait = Action.create('WAIT', 'Attendre', 'wait', null)
    await actionRepo.save(wait)

    const mission = Mission.create('Bridge patrol', 'user-1')
    mission.addStep(wait.id.value, '{}', false)
    await repo.save(mission)

    const dogId = '8570f711-2895-4632-9599-281083096058'
    dogGateway.addRobot(dogId, 'Rex', '1.0.0')

    await useCase.execute(mission.id.value, dogId)

    const result = await repo.listByRobotDog(dogId, { page: 1, limit: 10 })
    assert.lengthOf(result.data, 1)
  })

  test('should throw RobotDogNotFoundError when robot does not exist', async ({ assert }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    await repo.save(mission)

    await assert.rejects(
      () => useCase.execute(mission.id.value, '8570f711-2895-4632-9599-281083096058'),
      RobotDogNotFoundError
    )
  })

  test('should throw MissionNotFoundError when mission does not exist', async ({ assert }) => {
    const dogId = '8570f711-2895-4632-9599-281083096058'
    dogGateway.addRobot(dogId)

    await assert.rejects(
      () => useCase.execute('550e8400-e29b-41d4-a716-446655440000', dogId),
      MissionNotFoundError
    )
  })
})
