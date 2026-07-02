import { type RobotCommand } from '../types/robot-command.type.js'

export abstract class RobotCommunicationService {
  abstract sendCommand(dogId: string, command: RobotCommand, missionId?: string): Promise<void>
}
