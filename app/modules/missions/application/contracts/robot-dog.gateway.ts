import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

export abstract class RobotDogGateway {
  abstract findBy(id: RobotDogId): Promise<RobotDog | null>
}
