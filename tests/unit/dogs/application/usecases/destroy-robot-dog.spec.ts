import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { DestroyRobotDogUseCase } from '#dogs/application/usecases/destroy-robot-dog.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'

test.group('DestroyRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let useCase: DestroyRobotDogUseCase

  group.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    useCase = new DestroyRobotDogUseCase(fakeRepo)
  })

  test('should delete a robot dog if it exists', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute({ id: dog.id.value })

    const result = await fakeRepo.findById(dog.id)
    assert.isNull(result)
    assert.lengthOf(fakeRepo.storedDogs, 0)
  })

  test('should throw RobotDogNotFoundError if dog does not exist', async ({ assert }) => {
    const nonExistentId = '56a39d4d-b05d-42fb-a402-6782fc66dc3d'

    await assert.rejects(() => useCase.execute({ id: nonExistentId }), RobotDogNotFoundError)
  })
})
