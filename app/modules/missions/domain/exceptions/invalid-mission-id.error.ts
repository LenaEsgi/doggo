import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionId: ${value}`)
  }
}
