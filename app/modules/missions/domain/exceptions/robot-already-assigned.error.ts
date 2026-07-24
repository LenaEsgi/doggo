import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class RobotAlreadyAssignedError extends DomainError {
  constructor(missionId: string, robotDogId: string) {
    super(`Robot dog ${robotDogId} is already assigned to mission ${missionId}`)
  }
}
