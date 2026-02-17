import vine from '@vinejs/vine'

export const deleteUserParamValidator = vine.compile(
  vine.object({
    id: vine.string().uuid(),
  })
)
