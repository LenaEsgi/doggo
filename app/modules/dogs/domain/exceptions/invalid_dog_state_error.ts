export class InvalidDogStateError extends Error {
  readonly code = 'INVALID_DOG_STATE'

  constructor(currentState: string) {
    super(`Invalid dog state: ${currentState}`)
  }
}
