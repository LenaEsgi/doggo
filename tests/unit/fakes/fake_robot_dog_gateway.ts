import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

export class FakeRobotDogGateway implements RobotDogGateway {
  public robots: Map<string, any> = new Map()

  async findBy(id: RobotDogId) {
    return this.robots.get(id.value) || null
  }

  addRobot(id: string) {
    this.robots.set(id, { id })
  }
}
