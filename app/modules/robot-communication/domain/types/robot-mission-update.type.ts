import { type MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'

export interface RobotMissionUpdate {
  missionId: string
  stepId: string
  status: MissionStepStatus
}
