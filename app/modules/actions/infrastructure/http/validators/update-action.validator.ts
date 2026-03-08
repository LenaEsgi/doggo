import vine from '@vinejs/vine'

export const UpdateActionValidator = vine.create(
  vine.object({
    name: vine.string().minLength(1).trim().maxLength(50).optional(),
    slug: vine.string().minLength(1).maxLength(50).optional(),
    description: vine.string().minLength(1).nullable().optional(),
  })
)
