import vine from '@vinejs/vine'

export const UpdateRobotDogValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1),
  })
)
