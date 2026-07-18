import vine from '@vinejs/vine'

export const startMissionValidator = vine.compile(
  vine.object({
    missionId: vine.string().uuid(),
  })
)
