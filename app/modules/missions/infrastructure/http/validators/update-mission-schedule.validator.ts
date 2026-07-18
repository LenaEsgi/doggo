import vine from '@vinejs/vine'

export const UpdateMissionScheduleValidator = vine.create({
  daysOfWeek: vine.array(vine.number().min(1).max(7)).minLength(1),
  hour: vine.number().min(0).max(23),
  minute: vine.number().min(0).max(59),
})
