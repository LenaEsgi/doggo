import vine from '@vinejs/vine'

export const CreateRobotDogValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(2),
  })
)
