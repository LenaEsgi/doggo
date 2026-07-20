import vine from '@vinejs/vine'

export const CreateRobotDogValidator = vine.create(
  vine.object({
    serialNumber: vine.string().trim().minLength(3),
    name: vine.string().trim().minLength(2),
  })
)
