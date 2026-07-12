import vine from '@vinejs/vine'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

export const robotStateValidator = vine.compile(
  vine.object({
    state: vine.enum(Object.values(RobotDogState)),
  })
)
