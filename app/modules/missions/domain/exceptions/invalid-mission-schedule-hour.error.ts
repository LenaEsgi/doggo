import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionScheduleHourError extends DomainError {
  readonly code = 'MISSION_SCHEDULE_INVALID_HOUR'

  constructor(hour: number) {
    super(`Invalid hour for MissionSchedule: ${hour}. Must be between 0 and 23.`)
  }
}
