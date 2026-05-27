import vine from '@vinejs/vine'

export const assignUserDogValidator = vine.compile(
  vine.object({
    robotDogId: vine.string().uuid(),
    userId: vine.string().uuid(),
  })
)
