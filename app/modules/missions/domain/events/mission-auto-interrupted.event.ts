import { BaseEvent } from '@adonisjs/core/events'

export default class MissionAutoInterruptedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly missionId: string,
    public readonly missionName: string,
    public readonly robotDogId: string,
    public readonly reason: 'ROBOT_OFFLINE' | 'MAX_DURATION'
  ) {
    super()
  }
}
