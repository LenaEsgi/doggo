import vine from '@vinejs/vine'

export const disableMfaAuthValidator = vine.compile(
  vine.object({
    mfaEnrollmentId: vine.string().trim().minLength(1),
  })
)
