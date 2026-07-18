import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionScheduleIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionScheduleId: ${value}`)
  }
}
