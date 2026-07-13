import vine from '@vinejs/vine'

export const ToggleMissionScheduleValidator = vine.create({
  enabled: vine.boolean(),
})
