import { BaseEvent } from '@adonisjs/core/events'
import { type RobotDogState } from '#dogs/domain/enums/robot-dog.state'

export default class DogStateChangedEvent extends BaseEvent {
  constructor(
    public readonly dogId: string,
    public readonly state: RobotDogState
  ) {
    super()
  }
}
