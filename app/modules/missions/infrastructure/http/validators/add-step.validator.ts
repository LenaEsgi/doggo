import vine from '@vinejs/vine'

export const AddStepValidator = vine.create({
  actionId: vine.string().uuid(),
  parameters: vine.string(),
})
