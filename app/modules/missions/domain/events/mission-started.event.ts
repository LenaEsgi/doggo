import { BaseEvent } from '@adonisjs/core/events'

export default class MissionStartedEvent extends BaseEvent {
  constructor(
    public readonly missionId: string,
    public readonly missionName: string,
    public readonly robotDogId: string,
    public readonly robotDogName: string
  ) {
    super()
  }
}
