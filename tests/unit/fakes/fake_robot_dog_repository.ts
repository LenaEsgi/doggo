import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '../../../app/modules/dogs/domain/value-objects/robot-dog-id.js'

export class FakeRobotDogRepository extends RobotDogRepository {
  public storedDogs: RobotDog[] = []

  async findById(id: RobotDogId) {
    return this.storedDogs.find(d => d.id.equals(id)) ?? null
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
    this.storedDogs = this.storedDogs.filter(d => !d.id.equals(id))
  }

  async findBySerialNumber(serialNumber: string) {
    return this.storedDogs.find(d => d.serialNumber === serialNumber) ?? null
  }
}
