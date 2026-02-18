import { RobotDog } from '../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogRepository } from '../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'
import { RobotDogId } from '../../../app/modules/dogs/domain/value-objects/robot-dog-id.js'

export class FakeRobotDogRepository extends RobotDogRepository {
  public storedDogs: RobotDog[] = []

  async findById(id: RobotDogId) {
    return this.storedDogs.find(d => d.id === id) ?? null
  }

  async findAll() {
    return this.storedDogs
  }

  async save(dog: RobotDog) {
    const existingIndex = this.storedDogs.findIndex(d => d.id === dog.id)
    if (existingIndex >= 0) {
      this.storedDogs[existingIndex] = dog
    } else {
      this.storedDogs.push(dog)
    }
  }

  async delete(id: RobotDogId) {
    this.storedDogs = this.storedDogs.filter(d => d.id !== id)
  }
}
