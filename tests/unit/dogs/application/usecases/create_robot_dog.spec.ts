import { test } from '@japa/runner'
import { RobotDogRepository } from '../../../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import {
  CreateRobotDogUseCase
} from '../../../../../app/modules/dogs/application/usecases/create-robot-dog.use-case.js'

class FakeRobotDogRepository implements RobotDogRepository {
  public savedRobotDog: RobotDog | null = null

  async findById() {
    return null
  }

  async findAll() {
    return []
  }

  async save(dog: RobotDog) {
    this.savedRobotDog = dog
  }

  async delete() {}
}

test.group('CreateRobotDogUseCase', () => {
  test('should create and save a robot dog', async ({ assert }) => {
    const repository = new FakeRobotDogRepository()
    const useCase = new CreateRobotDogUseCase(repository)

    await useCase.execute({
      serialNumber: 'SN-001',
      name: 'Rex',
      batteryLevel: 80,
    })

    assert.isNotNull(repository.savedRobotDog)
    assert.equal(repository.savedRobotDog?.serialNumber, 'SN-001')
    assert.equal(repository.savedRobotDog?.batteryLevel, 80)
  })
})
