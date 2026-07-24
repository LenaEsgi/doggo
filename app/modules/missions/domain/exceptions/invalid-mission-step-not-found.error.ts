import { type MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionStepNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'MISSION_STEP_NOT_FOUND'

  constructor(stepId: MissionStepId) {
    super(`MissionStep with id ${stepId.toString()} was not found in this mission`)
  }
}
