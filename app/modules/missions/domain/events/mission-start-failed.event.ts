import { BaseEvent } from '@adonisjs/core/events'

export type MissionStartFailureReason =
  | 'ROBOT_OFFLINE'
  | 'ROBOT_ERROR'
  | 'ROBOT_BUSY'
  | 'BATTERY_TOO_LOW'
  | 'TIMEOUT'
  | 'FIRMWARE_INCOMPATIBLE'

export default class MissionStartFailedEvent extends BaseEvent {
  constructor(
    public readonly missionId: string,
    public readonly missionName: string,
    public readonly robotDogId: string,
    public readonly robotDogName: string,
    public readonly reason: MissionStartFailureReason
  ) {
    super()
  }
}
