import { RobotDog } from '../robot-dog.entity.js'
import { RobotDogId } from '../value-objects/robot-dog-id.js'
import { FindAllOptions } from '#dogs/domain/contracts/find-all-options'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export abstract class RobotDogRepository {
  abstract findById(id: RobotDogId): Promise<RobotDog | null>
  abstract findAll(options?: FindAllOptions): Promise<PaginatedResult<RobotDog>>
  abstract save(dog: RobotDog): Promise<void>
  abstract delete(id: RobotDogId): Promise<void>
  abstract findBySerialNumber(serialNumber: string): Promise<RobotDog | null>
}
