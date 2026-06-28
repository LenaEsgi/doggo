import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionAlreadyRunningError extends DomainError {
  constructor() {
    super('Mission is already running')
  }
}
