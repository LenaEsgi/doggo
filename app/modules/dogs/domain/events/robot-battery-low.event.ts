import { BaseEvent } from '@adonisjs/core/events'

export default class RobotBatteryLowEvent extends BaseEvent {
  constructor(
    public readonly robotDogId: string,
    public readonly robotDogName: string,
    public readonly batteryLevel: number
  ) {
    super()
  }
}
