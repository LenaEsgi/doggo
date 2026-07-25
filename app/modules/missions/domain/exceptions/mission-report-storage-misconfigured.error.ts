import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionReportStorageMisconfiguredError extends DomainError {
  readonly httpStatus = 500
  readonly code = 'MISSION_REPORT_STORAGE_MISCONFIGURED'
  constructor() {
    super('GCS_BUCKET_NAME is not configured')
  }
}
