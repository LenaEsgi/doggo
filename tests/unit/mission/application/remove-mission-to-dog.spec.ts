import { test } from '@japa/runner'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeRobotDogGateway } from '#tests/unit/fakes/fake-robot-dog-gateway'
import { RemoveMissionToDogUseCase } from '#app/modules/missions/application/usecases/remove-mission-to-dog.use-case'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'

test.group('RemoveMissionToDogUseCase', (group) => {
  let repo: FakeMissionRepository
  let dogGateway: FakeRobotDogGateway
  let runRepo: FakeMissionRunRepository
  let useCase: RemoveMissionToDogUseCase

  group.each.setup(() => {
    repo = new FakeMissionRepository()
    dogGateway = new FakeRobotDogGateway()
    runRepo = new FakeMissionRunRepository()
    useCase = new RemoveMissionToDogUseCase(repo, dogGateway, runRepo)
  })

  test('should remove mission from robot dog when both exist', async ({ assert }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    await repo.assignToDog(mission.id.value, dogId)
    dogGateway.addRobot(dogId)

    await useCase.execute(mission.id.value, dogId)

    const result = await repo.listByRobotDog(dogId, { page: 1, limit: 10 })
    assert.lengthOf(result.data, 0)
    assert.equal(result.meta.total, 0)
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

  test('should refuse to remove a robot with an active run on this mission', async ({ assert }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    await repo.assignToDog(mission.id.value, dogId)
    dogGateway.addRobot(dogId)
    await runRepo.save(MissionRun.start(mission.id, RobotDogId.fromString(dogId), []))

    await assert.rejects(
      () => useCase.execute(mission.id.value, dogId),
      InvalidMissionAlreadyRunningError
    )
  })

  test('should throw MissionNotAssignedToRobotError when the robot was never assigned', async ({
    assert,
  }) => {
    const mission = Mission.create('Bridge patrol', 'user-1')
    const dogId = '8570f711-2895-4632-9599-281083096058'

    await repo.save(mission)
    dogGateway.addRobot(dogId)

    await assert.rejects(
      () => useCase.execute(mission.id.value, dogId),
      MissionNotAssignedToRobotError
    )
  })
})
