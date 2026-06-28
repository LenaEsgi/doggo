import vine from '@vinejs/vine'

export const revokeUserDogValidator = vine.create(
  vine.object({
    robotDogId: vine.string().uuid(),
    userId: vine.string().uuid(),
  })
)
