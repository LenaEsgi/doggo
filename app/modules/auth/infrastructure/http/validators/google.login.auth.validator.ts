import vine from '@vinejs/vine'

export const googleLoginAuthValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
  })
)
