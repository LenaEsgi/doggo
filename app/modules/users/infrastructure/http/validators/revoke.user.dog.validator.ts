import vine from '@vinejs/vine'

export const revokeUserDogValidator = vine.compile(
  vine.object({
    robotDogId: vine.string().uuid(),
    userId: vine.string().uuid(),
  })
)
