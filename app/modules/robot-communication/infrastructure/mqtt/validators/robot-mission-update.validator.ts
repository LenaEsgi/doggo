import vine from '@vinejs/vine'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'

export const robotMissionUpdateValidator = vine.compile(
  vine.object({
    missionId: vine.string().uuid(),
    stepId: vine.string().uuid(),
    status: vine.enum(Object.values(MissionStepStatus)),
  })
)
