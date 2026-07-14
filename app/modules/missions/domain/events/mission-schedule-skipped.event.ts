import { BaseEvent } from '@adonisjs/core/events'

export default class MissionScheduleSkippedEvent extends BaseEvent {
  constructor(
    public readonly missionScheduleId: string,
    public readonly missionId: string,
    public readonly robotDogId: string
  ) {
    super()
  }
}
