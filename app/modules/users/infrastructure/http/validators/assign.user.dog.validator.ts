import vine from '@vinejs/vine'

export const assignUserDogValidator = vine.create(
  vine.object({
    robotDogId: vine.string().uuid(),
    userId: vine.string().uuid(),
  })
)
