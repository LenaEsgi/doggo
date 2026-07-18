import vine from '@vinejs/vine'

export const loginAuthValidator = vine.create(
  vine.object({
    email: vine.string().trim().email(),
    password: vine.string().minLength(8).maxLength(128),
  })
)
