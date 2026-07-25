import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import { MissionReportPayloadBuilder } from '#app/modules/missions/application/services/mission-report-payload.builder'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { MissionReportRequestPublisher } from '#app/modules/missions/domain/contracts/mission-report-request-publisher'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'

@inject()
export default class MissionReportRequestListener {
  constructor(
    private readonly payloadBuilder: MissionReportPayloadBuilder,
    private readonly reportRepository: MissionReportRepository,
    private readonly publisher: MissionReportRequestPublisher
  ) {}

  async handle(event: MissionCompletedEvent): Promise<void> {
    try {
      const payload = await this.payloadBuilder.build(event.missionRunId, event.missionName)
      if (!payload) {
        logger.warn({ missionRunId: event.missionRunId }, 'MissionReportRequestListener: run introuvable')
        return
      }

      const report = MissionReport.create(event.missionRunId, event.robotDogId)
      await this.reportRepository.save(report)

      await this.publisher.publish(payload)

      logger.info({ missionRunId: event.missionRunId }, 'MissionReportRequestListener: requête publiée')
    } catch (error) {
      logger.error(
        { err: error, missionRunId: event.missionRunId },
        'MissionReportRequestListener: échec (soft-fail, la mission reste valide)'
      )
    }
  }
}
