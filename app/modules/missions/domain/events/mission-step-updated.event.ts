import { BaseEvent } from '@adonisjs/core/events'
import { type MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { type MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

export default class MissionStepUpdatedEvent extends BaseEvent {
  constructor(
    public readonly missionId: string,
    public readonly robotDogId: string,
    public readonly stepId: string,
    public readonly stepStatus: MissionStepStatus,
    public readonly runStatus: MissionRunStatus
  ) {
    super()
  }
}
