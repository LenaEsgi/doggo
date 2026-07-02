import { type RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

export interface SendRobotCommandDto {
  dogId: string
  type: RobotCommand
  missionId?: string
}
