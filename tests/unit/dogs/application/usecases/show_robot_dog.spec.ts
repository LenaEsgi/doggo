import { test } from '@japa/runner'
import { ShowRobotDogUseCase } from '../../../../../app/modules/dogs/application/usecases/show-robot-dog.use-case.js'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogRepository } from '../../../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'

class FakeRobotDogRepository implements RobotDogRepository {
  public savedRobotDog: RobotDog | null = null

  async findById(id: any) {
    if (this.savedRobotDog && this.savedRobotDog.id.equals(id)) {
      return this.savedRobotDog
    }

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

test.group('Dogs application usecases show robot dog', () => {
  test('should return robot dog if found', async ({ assert }) => {
    const fakeRepo = new FakeRobotDogRepository()
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    fakeRepo.savedRobotDog = dog

    const useCase = new ShowRobotDogUseCase(fakeRepo)

    const result = await useCase.execute({ id: dog.id.value })

    assert.equal(result.id, dog.id.value)
  })
})
