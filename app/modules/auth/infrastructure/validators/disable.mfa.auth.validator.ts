import vine from '@vinejs/vine'

export const disableMfaAuthValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
    mfaEnrollmentId: vine.string().trim().minLength(1),
  })
)
