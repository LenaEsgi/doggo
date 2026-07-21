import { BaseEvent } from '@adonisjs/core/events'
import { type MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

export default class MissionCompletedEvent extends BaseEvent {
  constructor(
    public readonly missionId: string,
    public readonly missionName: string,
    public readonly robotDogId: string,
    public readonly status: MissionRunStatus
  ) {
    super()
  }
}
