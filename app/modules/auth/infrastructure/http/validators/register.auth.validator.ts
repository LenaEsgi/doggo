import vine from '@vinejs/vine'

export const registerAuthValidator = vine.compile(
  vine.object({
    firstname: vine.string().trim().minLength(2).maxLength(100),
    lastname: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email(),
    password: vine.string().minLength(8).maxLength(128),
  })
)
