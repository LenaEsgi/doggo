import { test } from '@japa/runner'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeRobotDogGateway } from '#tests/unit/fakes/fake-robot-dog-gateway'
import { RemoveMissionToDogUseCase } from '#app/modules/missions/application/usecases/remove-mission-to-dog.use-case'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'

test.group('RemoveMissionToDogUseCase', (group) => {
  let repo: FakeMissionRepository
  let dogGateway: FakeRobotDogGateway
  let useCase: RemoveMissionToDogUseCase

  group.each.setup(() => {
    repo = new FakeMissionRepository()
    dogGateway = new FakeRobotDogGateway()
    useCase = new RemoveMissionToDogUseCase(repo, dogGateway)
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
})
