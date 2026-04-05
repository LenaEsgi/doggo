import vine from '@vinejs/vine'

export const AssignMissionToDogValidator = vine.create({
  missionId: vine.string().uuid(),
})
