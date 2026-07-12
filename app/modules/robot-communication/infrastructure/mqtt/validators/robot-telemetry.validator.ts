import vine from '@vinejs/vine'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

export const robotTelemetryValidator = vine.compile(
  vine.object({
    battery: vine.number().min(0).max(100),
    state: vine.enum(Object.values(RobotDogState)).optional(),
  })
)
