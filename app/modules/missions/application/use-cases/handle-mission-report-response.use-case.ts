import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'

export type MissionReportResponsePayload =
  | { missionRunId: string; status: 'SUCCESS'; gcsObjectPath: string }
  | { missionRunId: string; status: 'FAILED'; reason: string }

@inject()
export class HandleMissionReportResponseUseCase {
  constructor(
    private readonly reportRepository: MissionReportRepository,
    private readonly ownershipRepository: OwnershipReadRepository,
    private readonly notificationService: NotificationService,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly missionRepository: MissionRepository
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
    const payload = await this.buildNotificationPayload(report.missionRunId)

    await this.notificationService.createBulk(ownerIds, type, severity, payload, report.robotDogId)
  }

  /**
   * Résout le nom de la mission pour personnaliser le message de notification.
   * Ne doit jamais bloquer/échouer le traitement de la réponse : en cas de run/mission
   * introuvable ou d'erreur inattendue, on se rabat sur un payload vide (message générique).
   */
  private async buildNotificationPayload(missionRunId: string): Promise<Record<string, unknown>> {
    try {
      const run = await this.missionRunRepository.findById(missionRunId)
      if (!run) {
        logger.warn(
          { missionRunId },
          'HandleMissionReportResponseUseCase: run introuvable, notification générique envoyée'
        )
        return {}
      }

      const mission = await this.missionRepository.findById(run.missionId)
      if (!mission) {
        logger.warn(
          { missionRunId, missionId: run.missionId.value },
          'HandleMissionReportResponseUseCase: mission introuvable, notification générique envoyée'
        )
        return {}
      }

      return { missionName: mission.name, missionRunId }
    } catch (error) {
      logger.warn(
        { err: error, missionRunId },
        'HandleMissionReportResponseUseCase: échec de résolution du nom de mission, notification générique envoyée'
      )
      return {}
    }
  }
}
