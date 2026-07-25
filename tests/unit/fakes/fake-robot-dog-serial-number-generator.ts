import { RobotDogSerialNumberGenerator } from '#dogs/domain/contracts/robot-dog-serial-number-generator'

export class FakeRobotDogSerialNumberGenerator extends RobotDogSerialNumberGenerator {
  private counter = 0

  async generate(): Promise<string> {
    this.counter += 1
    return `SN-${this.counter.toString().padStart(6, '0')}`
  }
}
