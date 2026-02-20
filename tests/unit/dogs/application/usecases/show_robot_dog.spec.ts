import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake_robot_dog_repository'
import { ShowRobotDogUseCaseImplementation } from '../../../../../app/modules/dogs/application/usecases/./show-robot-dog.use-case.implementation.js'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogNotFoundError } from '../../../../../app/modules/dogs/domain/exceptions/robot-dog-not-found.error.js'

test.group('ShowRobotDogUseCaseImplementation', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let useCase: ShowRobotDogUseCaseImplementation

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    useCase = new ShowRobotDogUseCaseImplementation(fakeRepo)
  })

  test('should return robot dog if found', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const result = await useCase.execute({ id: dog.id.value })

    assert.equal(result.id, dog.id.value)
    assert.equal(result.serialNumber, 'SN-001')
    assert.equal(result.name, 'Rex')
    assert.equal(result.batteryLevel, 80)
  })

  test('should throw if robot dog not found', async ({ assert }) => {
    await assert.rejects(
      () => useCase.execute({ id: '56a39d4d-b05d-42fb-a402-6782fc66dc3d' }),
      RobotDogNotFoundError
    )
  })
})
