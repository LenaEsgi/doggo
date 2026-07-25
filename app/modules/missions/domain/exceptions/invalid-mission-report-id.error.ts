import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionReportIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionReportId: ${value}`)
  }
}
