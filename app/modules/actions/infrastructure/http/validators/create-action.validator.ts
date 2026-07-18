import vine from '@vinejs/vine'

const parameterFieldSchema = vine.object({
  name: vine.string().minLength(1).maxLength(50),
  label: vine.string().minLength(1).maxLength(100),
  type: vine.enum(['number', 'string', 'boolean'] as const),
  required: vine.boolean(),
  unit: vine.string().optional(),
  min: vine.number().optional(),
  max: vine.number().optional(),
  defaultValue: vine.any().optional(),
})

export const CreateActionValidator = vine.create(
  vine.object({
    name: vine.string().minLength(1).trim().maxLength(100),
    code: vine.string().minLength(1).trim().maxLength(100),
    slug: vine.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).maxLength(100),
    description: vine.string().minLength(1).nullable().optional(),
    parameterSchema: vine
      .object({ fields: vine.array(parameterFieldSchema) })
      .nullable()
      .optional(),
  })
)
