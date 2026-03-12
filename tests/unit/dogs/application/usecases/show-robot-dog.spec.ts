import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { ShowRobotDogUseCase } from '#dogs/application/usecases/show-robot-dog.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'

test.group('ShowRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeOwnershipRepository: FakeOwnershipRepository
  let useCase: ShowRobotDogUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeOwnershipRepository = new FakeOwnershipRepository()
    useCase = new ShowRobotDogUseCase(fakeRepo, fakeOwnershipRepository)
  })

  test('should return robot dog if found', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const result = await useCase.execute({ id: dog.id.value })

    assert.equal(result.robotDog.id.value, dog.id.value)
    assert.equal(result.robotDog.serialNumber, 'SN-001')
    assert.equal(result.robotDog.name, 'Rex')
    assert.equal(result.robotDog.batteryLevel, 80)
    assert.equal(result.usersCount, 0)
  })

  test('should throw if robot dog not found', async ({ assert }) => {
    await assert.rejects(
      () => useCase.execute({ id: '56a39d4d-b05d-42fb-a402-6782fc66dc3d' }),
      RobotDogNotFoundError
    )
  })
})
