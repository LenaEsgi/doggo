import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionScheduleNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'MISSION_SCHEDULE_NOT_FOUND'

  constructor(scheduleId: string) {
    super(`Mission schedule with id ${scheduleId} was not found`)
  }
}
