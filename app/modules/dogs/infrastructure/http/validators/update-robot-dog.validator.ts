import vine from '@vinejs/vine'

export const UpdateRobotDogValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1),
  })
)
