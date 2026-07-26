import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionNotAvailableError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'ACTION_NOT_AVAILABLE'

  constructor(id: string) {
    super('Action with id ' + id + ' is not available')
  }
}
