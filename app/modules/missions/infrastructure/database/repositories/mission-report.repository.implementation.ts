import { DateTime } from 'luxon'
import { type MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import MissionReportModel from '#app/modules/missions/infrastructure/database/models/mission-report'

export class MissionReportRepositoryImplementation implements MissionReportRepository {
  async save(report: MissionReport): Promise<void> {
    await MissionReportModel.updateOrCreate(
      { id: report.id.value },
      {
        missionRunId: report.missionRunId,
        robotDogId: report.robotDogId,
        status: report.status,
        gcsObjectPath: report.gcsObjectPath,
        failureReason: report.failureReason,
        requestedAt: DateTime.fromJSDate(report.requestedAt),
        completedAt: report.completedAt ? DateTime.fromJSDate(report.completedAt) : null,
      }
    )
  }

  async findByMissionRunId(missionRunId: string): Promise<MissionReport | null> {
    const row = await MissionReportModel.query().where('mission_run_id', missionRunId).first()

    return row ? this.toDomain(row) : null
  }

  private toDomain(row: MissionReportModel): MissionReport {
    return MissionReport.rehydrate(
      row.id,
      row.missionRunId,
      row.robotDogId,
      row.status,
      row.gcsObjectPath,
      row.failureReason,
      row.requestedAt.toJSDate(),
      row.completedAt ? row.completedAt.toJSDate() : null
    )
  }
}
