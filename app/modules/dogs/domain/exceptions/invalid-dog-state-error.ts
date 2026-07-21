import { DomainError } from '#app/modules/share/exceptions/domain-error'

export type InvalidDogStateReason =
  | 'OFFLINE'
  | 'ERROR'
  | 'NOT_IDLE'
  | 'NO_ACTIVE_SESSION'
  | 'NO_ACTIVE_MISSION'
  | 'NOT_CHARGING'
  | 'NOT_OFFLINE'

export class InvalidDogStateError extends DomainError {
  readonly code = 'INVALID_DOG_STATE'

  constructor(
    public readonly reason: InvalidDogStateReason,
    public readonly currentState: string
  ) {
    super(`Invalid dog state transition: reason=${reason}, currentState=${currentState}`, {
      reason,
      currentState,
    })
  }
}
