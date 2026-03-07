import { type RobotDog } from '#dogs/domain/robot-dog.entity'
import { type RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

export abstract class RobotDogGateway {
  abstract findBy(id: RobotDogId): Promise<RobotDog | null>
}
