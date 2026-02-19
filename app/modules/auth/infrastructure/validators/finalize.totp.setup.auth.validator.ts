import vine from '@vinejs/vine'

export const finalizeTotpSetupAuthValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
    sessionInfo: vine.string().trim().minLength(1),
    verificationCode: vine
      .string()
      .trim()
      .regex(/^\d{6}$/),
    displayName: vine.string().trim().minLength(1).maxLength(100).optional(),
  })
)
