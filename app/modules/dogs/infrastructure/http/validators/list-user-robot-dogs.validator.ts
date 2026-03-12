import vine from '@vinejs/vine'

export const listUserRobotDogsParamsValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)
