import type MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'

export abstract class MissionReportRepository {
  abstract save(report: MissionReport): Promise<void>
  abstract findByMissionRunId(missionRunId: string): Promise<MissionReport | null>
}
