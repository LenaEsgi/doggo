import type { ApplicationService } from '@adonisjs/core/types'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission.repository.implementation'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionScheduleRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation'
import { MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { MissionScheduleFiringRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule-firing.repository.implementation'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { MissionReportRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-report.repository.implementation'
import { MissionReportRequestPublisher } from '#app/modules/missions/domain/contracts/mission-report-request-publisher'
import { RabbitMqMissionReportRequestPublisher } from '#app/modules/missions/infrastructure/queue/rabbitmq-mission-report-request-publisher'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { RobotDogGatewayImplementation } from '#app/modules/missions/infrastructure/gateways/robot-dog.gateway.implementation'
import { UserGateway } from '#app/modules/missions/application/contracts/user.gateway'
import { UserGatewayImplementation } from '#app/modules/missions/infrastructure/gateways/user.gateway.implementation'

export default class MissionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(MissionRepository, () => {
      return this.app.container.make(MissionRepositoryImplementation)
    })

    this.app.container.bind(MissionRunRepository, () => {
      return this.app.container.make(MissionRunRepositoryImplementation)
    })

    this.app.container.bind(MissionScheduleRepository, () => {
      return this.app.container.make(MissionScheduleRepositoryImplementation)
    })

    this.app.container.bind(MissionScheduleFiringRepository, () => {
      return this.app.container.make(MissionScheduleFiringRepositoryImplementation)
    })

    this.app.container.bind(MissionReportRepository, () => {
      return this.app.container.make(MissionReportRepositoryImplementation)
    })

    this.app.container.bind(MissionReportRequestPublisher, () => {
      return new RabbitMqMissionReportRequestPublisher()
    })

    this.app.container.bind(RobotDogGateway, () => {
      return this.app.container.make(RobotDogGatewayImplementation)
    })

    this.app.container.bind(UserGateway, () => {
      return this.app.container.make(UserGatewayImplementation)
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {
    if (this.app.getEnvironment() === 'web') {
      // No RabbitMQ broker is provisioned yet in some environments (e.g. the current
      // Cloud Run production deployment). Rather than attempting a connection that's
      // guaranteed to fail, skip starting the consumer entirely and say so clearly.
      if (!env.get('RABBITMQ_HOST')) {
        logger.info(
          'MissionProvider: RabbitMQ non configuré, le sous-système de rapport PDF est désactivé'
        )
        return
      }

      // A failed report must never fail the mission's business processing - and by the
      // same principle, RabbitMQ being absent/unreachable must never crash the whole
      // backend at boot. Provider ready() hooks are awaited sequentially with no
      // per-provider isolation, so an unhandled rejection here would propagate out of
      // app.start() and take down the entire process.
      try {
        const { startMissionReportResponseConsumer } = await import(
          '#app/modules/missions/infrastructure/queue/rabbitmq-mission-report-response.consumer'
        )
        await startMissionReportResponseConsumer()
      } catch (error) {
        logger.error(
          { err: error },
          'MissionProvider: échec du démarrage du consumer RabbitMQ (mission-report), le sous-système de rapport PDF est désactivé'
        )
      }
    }
  }

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
