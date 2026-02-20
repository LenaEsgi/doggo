import vine from '@vinejs/vine'

export const listMfaEnrollmentsAuthValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
  })
)
