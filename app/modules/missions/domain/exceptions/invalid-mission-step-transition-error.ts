// #app/modules/missions/domain/exceptions/invalid-mission-step-transition.exception.ts

import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionStepTransitionError extends DomainError {
  constructor(currentStatus?: string, attemptedStatus?: string) {
    const message = currentStatus && attemptedStatus
      ? `Cannot transition MissionStep from ${currentStatus} to ${attemptedStatus}`
      : 'Invalid MissionStep status transition'

    super(message)
    this.name = 'InvalidMissionStepTransitionException'
  }
}
