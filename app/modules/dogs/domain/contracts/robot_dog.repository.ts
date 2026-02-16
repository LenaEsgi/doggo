import { RobotDog } from '../robot_dog.entity.js'

export interface RobotDogRepository {
  findById(id: string): Promise<RobotDog | null>
  findAll(): Promise<RobotDog[]>
  save(dog: RobotDog): Promise<void>
  delete(id: string): Promise<void>
}
