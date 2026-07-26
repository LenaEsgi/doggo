import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class NoActiveMissionRunError extends DomainError {
  readonly code = 'NO_ACTIVE_MISSION_RUN'

  constructor(public readonly robotDogId: string) {
    super(`Robot dog ${robotDogId} has no active mission run`, { robotDogId })
  }
}
