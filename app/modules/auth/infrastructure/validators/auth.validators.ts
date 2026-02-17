import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    firstname: vine.string().trim().minLength(2).maxLength(100),
    lastname: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().minLength(8).maxLength(128),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().minLength(8).maxLength(128),
  })
)

export const passwordResetValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
  })
)

export const mfaLoginValidator = vine.compile(
  vine.object({
    pendingCredential: vine.string().trim().minLength(1),
    mfaEnrollmentId: vine.string().trim().minLength(1),
    verificationCode: vine
      .string()
      .trim()
      .regex(/^\d{6}$/),
  })
)

export const startTotpValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
  })
)

export const finalizeTotpValidator = vine.compile(
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

export const listMfaEnrollmentsValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
  })
)

export const disableMfaValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
    mfaEnrollmentId: vine.string().trim().minLength(1),
  })
)
