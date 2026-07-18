import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidDogStateError extends DomainError {
  readonly code = 'INVALID_DOG_STATE'

  constructor(currentState: string) {
    super(`Invalid dog state: ${currentState}`)
  }
}
