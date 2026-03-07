import vine from '@vinejs/vine'

export const AddStepValidator = vine.create({
  actionId: vine.string().uuid(),
  sequenceOrder: vine.number().min(1),
  parameters: vine.string(),
})
