import vine from '@vinejs/vine'

export const loginWithTotpAuthValidator = vine.create(
  vine.object({
    pendingCredential: vine.string().trim().minLength(1),
    mfaEnrollmentId: vine.string().trim().minLength(1),
    verificationCode: vine
      .string()
      .trim()
      .regex(/^\d{6}$/),
  })
)
