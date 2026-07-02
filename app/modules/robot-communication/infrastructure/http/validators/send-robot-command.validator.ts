import vine from '@vinejs/vine'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

export const sendRobotCommandValidator = vine.compile(
  vine.object({
    type: vine.enum(Object.values(RobotCommand)),
    missionId: vine.string().uuid().optional(),
  })
)
