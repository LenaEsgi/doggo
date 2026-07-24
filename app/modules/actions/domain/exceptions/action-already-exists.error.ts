import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionAlreadyExistsError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'ACTION_ALREADY_EXISTS'

  constructor(code: string) {
    super('Action with code ' + code + ' already exist')
  }
}
