import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionReportNotFoundError extends DomainError {
  readonly httpStatus = 403
  readonly code = 'MISSION_REPORT_NOT_FOUND'
  constructor(missionRunId: string) {
    super(`No mission report for run ${missionRunId}`)
  }
}
