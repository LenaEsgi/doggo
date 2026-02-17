import { RobotDog } from '../robot_dog.entity.js'
import { RobotDogId } from '../value-objects/robot-dog-id.js'

export interface RobotDogRepository {
  findById(id: RobotDogId): Promise<RobotDog | null>
  findAll(): Promise<RobotDog[]>
  save(dog: RobotDog): Promise<void>
  delete(id: RobotDogId): Promise<void>
}
