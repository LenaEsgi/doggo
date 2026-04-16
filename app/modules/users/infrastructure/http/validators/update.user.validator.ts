import vine from '@vinejs/vine'

export const updateUserParamValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)

export const updateUserValidator = vine.compile(
  vine.object({
    firebaseUid: vine.string().trim().minLength(1).maxLength(128).optional(),
    firstname: vine.string().trim().minLength(2).maxLength(100).optional(),
    lastname: vine.string().trim().minLength(2).maxLength(100).optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    role: vine.enum(['user', 'admin'] as const).optional(),
    email_verified: vine.boolean().optional(),
  })
)
