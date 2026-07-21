import { inject } from '@adonisjs/core'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import {
  RobotCommand,
  type Throttle,
  type Steering,
} from '#app/modules/robot-communication/domain/types/robot-command.type'

@inject()
export class SendDriveCommandUseCase {
  constructor(private readonly communicationService: RobotCommunicationService) {}

  async execute(dogId: string, throttle: Throttle, steering: Steering): Promise<void> {
    await this.communicationService.sendCommand(dogId, RobotCommand.DRIVE, { throttle, steering })
  }
}
