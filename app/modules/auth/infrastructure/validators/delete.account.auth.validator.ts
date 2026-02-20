import vine from '@vinejs/vine'

export const deleteAccountAuthValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
  })
)
