import vine from '@vinejs/vine'

export const listUserRobotDogsParamsValidator = vine.create(
  vine.object({
    id: vine.string().uuid(),
  })
)
