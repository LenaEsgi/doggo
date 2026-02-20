import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    firstname: vine.string().trim().minLength(2).maxLength(100),
    lastname: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email().normalizeEmail(),
  })
)
