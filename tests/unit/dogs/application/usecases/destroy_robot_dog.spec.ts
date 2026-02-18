import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake_robot_dog_repository'
import {
  DeleteRobotDogUseCase
} from '../../../../../app/modules/dogs/application/usecases/destroy-robot-dog.use-case.js'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogNotFoundError } from '../../../../../app/modules/dogs/domain/exceptions/robot-dog-not-found.error.js'


test.group('DestroyRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let useCase: DeleteRobotDogUseCase

  group.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    useCase = new DeleteRobotDogUseCase(fakeRepo)
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
    const nonExistentId = 'non-existent-id'

    await assert.rejects(
      () => useCase.execute({ id: nonExistentId }),
      RobotDogNotFoundError
    )
  })
})
