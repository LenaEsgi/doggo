import vine from '@vinejs/vine'

export const CreateActionValidator = vine.create(
  vine.object({
    name: vine.string().minLength(1).trim().maxLength(100),
    code: vine.string().minLength(1).trim().maxLength(100),
    slug: vine.string().minLength(1),
    description: vine.string().minLength(1).nullable().optional(),
  })
)
