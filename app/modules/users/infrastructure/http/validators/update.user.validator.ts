import vine from '@vinejs/vine'

export const updateUserParamValidator = vine.create(
  vine.object({
    id: vine.string().uuid(),
  })
)

export const updateUserValidator = vine.create(
  vine.object({
    firstname: vine.string().trim().minLength(2).maxLength(100).optional(),
    lastname: vine.string().trim().minLength(2).maxLength(100).optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    role: vine.enum(['user', 'admin'] as const).optional(),
    locale: vine.enum(['fr', 'en'] as const).optional(),
  })
)
