import { MissionReportId } from '#app/modules/missions/domain/value-objects/mission-report-id'
import { MissionReportStatus } from '#app/modules/missions/domain/enums/mission-report-status'

// Defense in depth: the `failure_reason` column is `text` (unbounded), but the Rust
// worker builds this string from anyhow::Error context chains (GCS/HTTP errors etc.)
// which could in theory grow unreasonably large. Truncate to keep stored data sane.
const MAX_FAILURE_REASON_LENGTH = 2000

export default class MissionReport {
  private constructor(
    private readonly _id: MissionReportId,
    private readonly _missionRunId: string,
    private readonly _robotDogId: string,
    private _status: MissionReportStatus,
    private _gcsObjectPath: string | null,
    private _failureReason: string | null,
    private readonly _requestedAt: Date,
    private _completedAt: Date | null
  ) {}

  static create(missionRunId: string, robotDogId: string): MissionReport {
    return new MissionReport(
      MissionReportId.generate(),
      missionRunId,
      robotDogId,
      MissionReportStatus.PENDING,
      null,
      null,
      new Date(),
      null
    )
  }

  static rehydrate(
    id: string,
    missionRunId: string,
    robotDogId: string,
    status: MissionReportStatus,
    gcsObjectPath: string | null,
    failureReason: string | null,
    requestedAt: Date,
    completedAt: Date | null
  ): MissionReport {
    return new MissionReport(
      MissionReportId.fromString(id),
      missionRunId,
      robotDogId,
      status,
      gcsObjectPath,
      failureReason,
      requestedAt,
      completedAt
    )
  }

  markReady(gcsObjectPath: string): void {
    this._status = MissionReportStatus.READY
    this._gcsObjectPath = gcsObjectPath
    this._completedAt = new Date()
  }

  markFailed(reason: string): void {
    this._status = MissionReportStatus.FAILED
    this._failureReason = reason.slice(0, MAX_FAILURE_REASON_LENGTH)
    this._completedAt = new Date()
  }

  get id(): MissionReportId {
    return this._id
  }

  get missionRunId(): string {
    return this._missionRunId
  }

  get robotDogId(): string {
    return this._robotDogId
  }

  get status(): MissionReportStatus {
    return this._status
  }

  get gcsObjectPath(): string | null {
    return this._gcsObjectPath
  }

  get failureReason(): string | null {
    return this._failureReason
  }

  get requestedAt(): Date {
    return this._requestedAt
  }

  get completedAt(): Date | null {
    return this._completedAt
  }
}
