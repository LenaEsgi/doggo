import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionRunIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionRunId: ${value}`)
  }
}
