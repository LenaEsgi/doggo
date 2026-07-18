import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidUserNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'USER_NOT_FOUND'

  constructor(id: string) {
    super(`User with id ${id.toString()} was not found in this users`)
    this.name = 'UserNotFoundError'
  }
}
