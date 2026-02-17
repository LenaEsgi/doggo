import { test } from '@japa/runner'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import {
  UpdateRobotDogUseCase
} from '../../../../../app/modules/dogs/application/usecases/update-robot-dog.use-case.js'
import { RobotDogRepository } from '../../../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'
import { RobotDogNotFoundError } from '../../../../../app/modules/dogs/domain/exceptions/robot-dog-not-found.error.js'

class FakeRobotDogRepository implements RobotDogRepository {
  private dogs: RobotDog[] = []

  async findById(id: any) {
    return this.dogs.find((dog) => dog.id.equals(id)) ?? null
  }

  async findAll() {
    return this.dogs
  }

  async save(dog: RobotDog) {
    const index = this.dogs.findIndex((d) => d.id.equals(dog.id))

    if (index >= 0) {
      this.dogs[index] = dog
    } else {
      this.dogs.push(dog)
    }
  }

  async delete(id: any) {
    this.dogs = this.dogs.filter((dog) => !dog.id.equals(id))
  }
}

test.group('UpdateRobotDogUseCase', () => {
  test('should update the name successfully', async ({ assert }) => {
    const fakeRepo = new FakeRobotDogRepository()
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const useCase = new UpdateRobotDogUseCase(fakeRepo)
    await useCase.execute({ id: dog.id.value, name: 'Bolt' })

    const updated = await fakeRepo.findById(dog.id)
    assert.equal(updated?.name, 'Bolt')
  })

  test('should throw RobotDogNotFoundError if robot does not exist', async ({ assert }) => {
    const fakeRepo = new FakeRobotDogRepository()
    const useCase = new UpdateRobotDogUseCase(fakeRepo)

    await assert.rejects(async () => {
      await useCase.execute({ id: 'non-existent-id', name: 'Bolt' })
    }, RobotDogNotFoundError )
  })
})
