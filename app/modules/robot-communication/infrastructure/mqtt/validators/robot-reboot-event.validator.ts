import vine from '@vinejs/vine'
import { RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'

export const robotRebootEventValidator = vine.compile(
  vine.object({
    firmwareVersion: vine.string().trim().minLength(1),
    bootReason: vine.enum(Object.values(RobotBootReason)),
    uptimeBeforeRebootSec: vine.number().min(0).optional(),
  })
)
