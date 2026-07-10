import { type RobotCommand, type RobotCommandData } from '../types/robot-command.type.js'

export abstract class RobotCommunicationService {
  abstract sendCommand(
    dogId: string,
    command: RobotCommand,
    data?: RobotCommandData
  ): Promise<void>
}
