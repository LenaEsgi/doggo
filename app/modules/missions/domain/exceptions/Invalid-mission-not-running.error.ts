import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionNotRunningError extends DomainError {
  constructor() {
    super('Mission is not running')
  }
}
