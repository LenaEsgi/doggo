import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionAlreadyRunningError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'MISSION_ALREADY_RUNNING'

  constructor() {
    super('Mission is already running')
  }
}
