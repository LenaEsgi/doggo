import { BaseEvent } from '@adonisjs/core/events'

export default class OwnershipRevokedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly robotDogId: string
  ) {
    super()
  }
}
