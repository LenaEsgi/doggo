import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionStepNotFoundError extends DomainError {
  constructor(stepId: MissionStepId) {
    super(`MissionStep with id "${stepId.toString()}" was not found in this mission`)
    this.name = 'MissionStepNotFoundError'
  }
}
