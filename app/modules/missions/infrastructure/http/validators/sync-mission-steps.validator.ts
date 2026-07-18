import vine from '@vinejs/vine'

export const SyncMissionStepsValidator = vine.create({
  steps: vine.array(
    vine.object({
      id: vine.string().uuid().optional(),
      actionId: vine.string().uuid(),
      parameters: vine.string(),
    })
  ),
})
