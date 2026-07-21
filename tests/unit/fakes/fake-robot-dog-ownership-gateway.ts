import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import type { RobotDog } from '#dogs/domain/robot-dog.entity'

export class FakeRobotDogOwnershipGateway extends RobotDogOwnershipGateway {
  constructor(private readonly dogs: Record<string, Pick<RobotDog, 'id' | 'name'>> = {}) {
    super()
  }

  async existsById(robotDogId: string): Promise<boolean> {
    return robotDogId in this.dogs
  }

  async findBySerialNumber(): Promise<RobotDog | null> {
    return null
  }

  async findByIds(ids: string[]): Promise<RobotDog[]> {
    return ids
      .map((id) => this.dogs[id])
      .filter((dog): dog is Pick<RobotDog, 'id' | 'name'> => Boolean(dog)) as RobotDog[]
  }
}
