import vine from '@vinejs/vine'
import { RobotErrorSeverity } from '#app/modules/robot-communication/domain/enums/robot-error-severity'

export const robotErrorEventValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(1),
    component: vine.string().trim().minLength(1),
    message: vine.string().trim().minLength(1),
    severity: vine.enum(Object.values(RobotErrorSeverity)),
    context: vine.record(vine.any()).optional(),
  })
)
