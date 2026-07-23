import { type RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { type RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

export class FakeRobotDogGateway implements RobotDogGateway {
  public robots: Map<string, any> = new Map()

  async findBy(id: RobotDogId) {
    return this.robots.get(id.value) || null
  }

  addRobot(id: string, name: string = 'Rex', firmwareVersion: string = '1.0.0') {
    this.robots.set(id, { id, name, firmwareVersion })
  }
}
