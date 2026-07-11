import { type RobotDog } from '#app/modules/dogs/domain/robot-dog.entity'
import { type RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { type FindAllOptions } from '#dogs/domain/contracts/find-all-options'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export abstract class RobotDogRepository {
  abstract findById(id: RobotDogId): Promise<RobotDog | null>
  abstract findByIds(ids: string[]): Promise<RobotDog[]>
  abstract findAll(options?: FindAllOptions): Promise<PaginatedResult<RobotDog>>
  abstract save(dog: RobotDog): Promise<void>
  abstract delete(id: RobotDogId): Promise<void>
  abstract findBySerialNumber(serialNumber: string): Promise<RobotDog | null>
}
