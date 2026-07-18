import vine from '@vinejs/vine'

export const disableMfaAuthValidator = vine.create(
  vine.object({
    mfaEnrollmentId: vine.string().trim().minLength(1),
  })
)
