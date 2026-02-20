import vine from '@vinejs/vine'

export const startTotpSetupAuthValidator = vine.compile(
  vine.object({
    idToken: vine.string().trim().minLength(1),
  })
)
