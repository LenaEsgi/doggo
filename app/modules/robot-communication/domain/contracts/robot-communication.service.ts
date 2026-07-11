import {
  type RobotCommand,
  type RobotCommandData,
} from '#app/modules/robot-communication/domain/types/robot-command.type'

export abstract class RobotCommunicationService {
  abstract sendCommand(dogId: string, command: RobotCommand, data?: RobotCommandData): Promise<void>
}
