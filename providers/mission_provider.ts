import type { ApplicationService } from '@adonisjs/core/types'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission.repository.implementation'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
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
