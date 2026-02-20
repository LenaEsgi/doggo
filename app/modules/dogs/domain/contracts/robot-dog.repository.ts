import { RobotDog } from '../robot-dog.entity.js'
import { RobotDogId } from '../value-objects/robot-dog-id.js'

export abstract class RobotDogRepository {
  abstract findById(id: RobotDogId): Promise<RobotDog | null>
  abstract findAll(): Promise<RobotDog[]>
  abstract save(dog: RobotDog): Promise<void>
  abstract delete(id: RobotDogId): Promise<void>
}
