import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class NoActiveMissionRunError extends DomainError {
  constructor(robotDogId: string) {
    super(`Robot dog ${robotDogId} has no active mission run`)
    this.name = 'NoActiveMissionRunError'
  }
}
