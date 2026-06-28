import vine from '@vinejs/vine'

export const showUserParamValidator = vine.create(
  vine.object({
    id: vine.string().uuid(),
  })
)
