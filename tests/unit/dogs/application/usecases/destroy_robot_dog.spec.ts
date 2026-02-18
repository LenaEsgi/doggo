import { test } from '@japa/runner'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogRepository } from '../../../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'
import { RobotDogId } from '../../../../../app/modules/dogs/domain/value-objects/robot-dog-id.js'
import {
  DeleteRobotDogUseCase
} from '../../../../../app/modules/dogs/application/usecases/destroy-robot-dog.use-case.js'

import { RobotDogNotFoundError } from '../../../../../app/modules/dogs/domain/exceptions/robot-dog-not-found.error.js'

// FakeRepository avec mémoire interne
class FakeRobotDogRepository implements RobotDogRepository {
  private dogs: RobotDog[] = []

  async findById(id: RobotDogId) {
    return this.dogs.find(d => d.id.equals(id)) ?? null
  }

  async findAll() {
    return this.dogs
  }

  async save(dog: RobotDog) {
    this.dogs.push(dog)
  }

  async delete(id: RobotDogId) {
    this.dogs = this.dogs.filter(d => !d.id.equals(id))
  }
}

test.group('DeleteRobotDogUseCase', () => {
  test('should delete robot dog if exists', async ({ assert }) => {
    const fakeRepo = new FakeRobotDogRepository()
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    await fakeRepo.save(dog)

    const useCase = new DeleteRobotDogUseCase(fakeRepo)
    await useCase.execute({ id: dog.id.value })

    const result = await fakeRepo.findById(dog.id)
    assert.isNull(result)
  })

  test('should throw if robot dog does not exist', async ({ assert }) => {
    const fakeRepo = new FakeRobotDogRepository()
    const useCase = new DeleteRobotDogUseCase(fakeRepo)

    await assert.rejects(
      () => useCase.execute({ id: 'non-existent-id' }),
      RobotDogNotFoundError
    )
  })
})
