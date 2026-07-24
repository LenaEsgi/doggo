import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'ACTION_NOT_FOUND'

  constructor(id: string) {
    super('Action with id ' + id + ' not found')
  }
}
