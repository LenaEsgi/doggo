import { BaseEvent } from '@adonisjs/core/events'

export default class OwnershipAssignedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly robotDogId: string
  ) {
    super()
  }
}
