import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionNotFoundError extends DomainError {
  readonly code = 'MISSION_NOT_FOUND'

  constructor(missionId: string) {
    super(`Mission with id ${missionId} was not found`)
  }
}
