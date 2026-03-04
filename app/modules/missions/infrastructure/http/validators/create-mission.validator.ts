import vine from '@vinejs/vine'

export const CreateMissionValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  robotDogId: vine.string().uuid(),
  userId: vine.string().uuid(),
})
