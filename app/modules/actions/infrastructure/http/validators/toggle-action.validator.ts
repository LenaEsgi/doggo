import vine from '@vinejs/vine'

export const ToggleActionValidator = vine.create({
  isActive: vine.boolean(),
})
