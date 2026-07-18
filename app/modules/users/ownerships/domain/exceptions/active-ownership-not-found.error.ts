import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActiveOwnershipNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'ACTIVE_OWNERSHIP_NOT_FOUND'

  constructor(userId: string, robotDogId: string) {
    super(`Active ownership between user ${userId} and robot dog ${robotDogId} was not found`)
    this.name = 'ActiveOwnershipNotFoundError'
  }
}
