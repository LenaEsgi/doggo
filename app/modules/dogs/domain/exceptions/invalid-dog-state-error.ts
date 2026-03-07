import { DomainError } from '../../../share/exceptions/domain-error.js'

export class InvalidDogStateError extends DomainError {
  readonly code = 'INVALID_DOG_STATE'

  constructor(currentState: string) {
    super(`Invalid dog state: ${currentState}`)
  }
}
