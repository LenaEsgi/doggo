import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake_robot_dog_repository'
import { ShowRobotDogUseCase } from '../../../../../app/modules/dogs/application/usecases/show-robot-dog.use-case.js'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogNotFoundError } from '../../../../../app/modules/dogs/domain/exceptions/robot-dog-not-found.error.js'

test.group('ShowRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let useCase: ShowRobotDogUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    useCase = new ShowRobotDogUseCase(fakeRepo)
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
      () => useCase.execute({ id: 'non-existent-id' }),
      RobotDogNotFoundError
    )
  })
})
