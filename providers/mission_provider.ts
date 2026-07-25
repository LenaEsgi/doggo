import type { ApplicationService } from '@adonisjs/core/types'
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
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
