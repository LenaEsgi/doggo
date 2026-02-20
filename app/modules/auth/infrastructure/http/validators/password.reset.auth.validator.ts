import vine from '@vinejs/vine'

export const passwordResetAuthValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
  })
)
