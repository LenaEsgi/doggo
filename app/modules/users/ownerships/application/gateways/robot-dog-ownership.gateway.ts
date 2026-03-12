import type { RobotDog } from '#dogs/domain/robot-dog.entity'

export abstract class RobotDogOwnershipGateway {
  abstract existsById(robotDogId: string): Promise<boolean>
  abstract findByIds(ids: string[]): Promise<RobotDog[]>
}
