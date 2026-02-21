import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '../../../app/modules/dogs/domain/value-objects/robot-dog-id.js'
import { FindAllOptions } from '#dogs/domain/contracts/find-all-options'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export class FakeRobotDogRepository extends RobotDogRepository {
  public storedDogs: RobotDog[] = []

  async findById(id: RobotDogId) {
    return this.storedDogs.find(d => d.id.equals(id)) ?? null
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<RobotDog>> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20

    const start = (page - 1) * limit
    const end = start + limit

    const paginatedData = this.storedDogs.slice(start, end)

    const total = this.storedDogs.length
    const lastPage = Math.ceil(total / limit)

    return {
      data: paginatedData,
      meta: {
        total,
        perPage: limit,
        currentPage: page,
        firstPage: 1,
        lastPage,
      },
    }
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
