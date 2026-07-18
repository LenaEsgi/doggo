import vine from '@vinejs/vine'

export const googleLoginAuthValidator = vine.create(
  vine.object({
    idToken: vine.string().trim().minLength(1),
  })
)
