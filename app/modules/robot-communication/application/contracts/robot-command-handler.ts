import { type RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

export interface RobotCommandHandler {
  readonly command: RobotCommand
  execute(dogId: string, missionId?: string): Promise<void>
}
