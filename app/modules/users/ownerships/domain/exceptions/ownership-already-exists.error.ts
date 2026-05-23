import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class OwnershipAlreadyExistsError extends DomainError {
  constructor(userId: string, robotDogId: string) {
    super(`User ${userId} already has an active ownership of robot dog ${robotDogId}`)
    this.name = 'OwnershipAlreadyExistsError'
  }
}
