import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'MISSION_NOT_FOUND'

  constructor(missionId: string) {
    super(`Mission with id ${missionId} was not found`)
  }
}
