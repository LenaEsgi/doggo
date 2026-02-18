import type { ApplicationService } from '@adonisjs/core/types'
import {
  RobotDogRepositoryImplementation
} from '../app/modules/dogs/infrastructure/database/repositories/robot_dog.repository.implementation.js'
import { RobotDogRepository } from '../app/modules/dogs/domain/contracts/robot_dog.repository.js'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {
    this.app.container.bind(RobotDogRepository, () => {
      return new RobotDogRepositoryImplementation()
    })
  }

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
