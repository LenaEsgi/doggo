import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionScheduleDaysOfWeekError extends DomainError {
  readonly code = 'MISSION_SCHEDULE_INVALID_DAYS_OF_WEEK'

  constructor(message: string) {
    super(message)
  }
}
