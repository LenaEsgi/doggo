import type { ApplicationService } from '@adonisjs/core/types'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogRepositoryImplementation } from '#dogs/infrastructure/database/repositories/robot-dog.repository.implementation'

export default class RobotDogProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(RobotDogRepository, () => {
      return this.app.container.make(RobotDogRepositoryImplementation)
    })

    this.app.container.bind(RobotDogRepository, () => {
      return this.app.container.make(RobotDogRepositoryImplementation)
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
