import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionRunStepIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionRunStepId: ${value}`)
  }
}
