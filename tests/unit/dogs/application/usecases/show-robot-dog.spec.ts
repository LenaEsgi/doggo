import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { ShowRobotDogUseCase } from '#dogs/application/usecases/show-robot-dog.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'

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
      () => useCase.execute({ id: '56a39d4d-b05d-42fb-a402-6782fc66dc3d' }),
      RobotDogNotFoundError
    )
  })
})
