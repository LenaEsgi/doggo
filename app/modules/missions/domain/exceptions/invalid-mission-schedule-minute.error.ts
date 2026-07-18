import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionScheduleMinuteError extends DomainError {
  readonly code = 'MISSION_SCHEDULE_INVALID_MINUTE'

  constructor(minute: number) {
    super(`Invalid minute for MissionSchedule: ${minute}. Must be between 0 and 59.`)
  }
}
