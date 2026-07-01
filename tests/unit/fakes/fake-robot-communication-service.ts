import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { type RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

export class FakeRobotCommunicationService extends RobotCommunicationService {
  public calls: { dogId: string; command: RobotCommand; missionId?: string }[] = []
  public shouldFail = false

  async sendCommand(dogId: string, command: RobotCommand, missionId?: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('MQTT client is not connected')
    }
    this.calls.push({ dogId, command, missionId })
  }
}
