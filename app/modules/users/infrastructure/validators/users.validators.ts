import vine from '@vinejs/vine'

export const userIdParamValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)

export const updateUserValidator = vine.compile(
  vine.object({
    firstname: vine.string().trim().minLength(2).maxLength(100).optional(),
    lastname: vine.string().trim().minLength(2).maxLength(100).optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    role: vine.enum(['user', 'admin'] as const).optional(),
  })
)
