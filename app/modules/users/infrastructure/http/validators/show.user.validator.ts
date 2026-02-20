import vine from '@vinejs/vine'

export const showUserParamValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)
