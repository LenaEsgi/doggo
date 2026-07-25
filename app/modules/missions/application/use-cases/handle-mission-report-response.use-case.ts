import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { NotificationService } from '#app/modules/notifications/application/notification.service'

export type MissionReportResponsePayload =
  | { missionRunId: string; status: 'SUCCESS'; gcsObjectPath: string }
  | { missionRunId: string; status: 'FAILED'; reason: string }

@inject()
export class HandleMissionReportResponseUseCase {
  constructor(
    private readonly reportRepository: MissionReportRepository,
    private readonly ownershipRepository: OwnershipReadRepository,
    private readonly notificationService: NotificationService
  ) {}

  async execute(response: MissionReportResponsePayload): Promise<void> {
    const report = await this.reportRepository.findByMissionRunId(response.missionRunId)
    if (!report) {
      logger.warn(
        { missionRunId: response.missionRunId },
        'HandleMissionReportResponseUseCase: rapport introuvable'
      )
      return
    }

    if (response.status === 'SUCCESS') {
      report.markReady(response.gcsObjectPath)
    } else {
      report.markFailed(response.reason)
    }
    await this.reportRepository.save(report)

    const ownerIds = await this.ownershipRepository.findAllActiveUserIdsByRobotDogId(
      report.robotDogId
    )
    const type = response.status === 'SUCCESS' ? 'mission.report_ready' : 'mission.report_failed'
    const severity = response.status === 'SUCCESS' ? 'success' : 'critical'

    await this.notificationService.createBulk(ownerIds, type, severity, {}, report.robotDogId)
  }
}
