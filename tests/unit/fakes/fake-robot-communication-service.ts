import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import {
  type Throttle,
  type Steering,
  type RobotCommand,
  type RobotCommandData,
  type RobotCommandStep,
} from '#app/modules/robot-communication/domain/types/robot-command.type'

export class FakeRobotCommunicationService extends RobotCommunicationService {
  public calls: {
    dogId: string
    command: RobotCommand
    runId?: string
    missionId?: string
    steps?: RobotCommandStep[]
    throttle?: Throttle
    steering?: Steering
  }[] = []
  public shouldFail = false

  async sendCommand(dogId: string, command: RobotCommand, data?: RobotCommandData): Promise<void> {
    if (this.shouldFail) {
      throw new Error('MQTT client is not connected')
    }
    this.calls.push({
      dogId,
      command,
      runId: data?.runId,
      missionId: data?.missionId,
      steps: data?.steps,
      throttle: data?.throttle,
      steering: data?.steering,
    })
  }
}
