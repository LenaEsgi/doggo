import vine from '@vinejs/vine'

export const passwordResetAuthValidator = vine.create(
  vine.object({
    email: vine.string().trim().email(),
  })
)
