import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionReportNotReadyError extends DomainError {
  readonly httpStatus = 403
  readonly code = 'MISSION_REPORT_NOT_READY'
  constructor(missionRunId: string) {
    super(`Mission report for run ${missionRunId} is not ready yet`)
  }
}
