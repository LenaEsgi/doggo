import vine from '@vinejs/vine'

export const UpdateMissionValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
})
