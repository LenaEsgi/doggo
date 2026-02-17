import { test } from '@japa/runner'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import { ListRobotDogsUseCase } from '../../../../../app/modules/dogs/application/usecases/index-robot-dogs.use-case.js'
import { RobotDogRepository } from '../../../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'

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

test.group('Dogs application usecases list robot dogs', () => {
  test('should return all robot dogs', async ({ assert }) => {
    const fakeRepo = new FakeRobotDogRepository()

    const dog1 = RobotDog.create('SN-001', 'Rex', 80)
    const dog2 = RobotDog.create('SN-002', 'Bolt', 70)

    await fakeRepo.save(dog1)
    await fakeRepo.save(dog2)

    const useCase = new ListRobotDogsUseCase(fakeRepo)

    const result = await useCase.execute()

    assert.lengthOf(result, 2)
    assert.equal(result[0].serialNumber, 'SN-001')
    assert.equal(result[1].serialNumber, 'SN-002')
  })

  test('should return empty array if no robot dogs', async ({ assert }) => {
    const fakeRepo = new FakeRobotDogRepository()
    const useCase = new ListRobotDogsUseCase(fakeRepo)

    const result = await useCase.execute()

    assert.lengthOf(result, 0)
  })
})
