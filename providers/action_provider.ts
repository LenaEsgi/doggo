import type { ApplicationService } from '@adonisjs/core/types'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionRepositoryImplementation } from '#app/modules/actions/infrastructure/database/repositories/action.repository.implementation'

export default class ActionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(ActionRepository, () => {
      return this.app.container.make(ActionRepositoryImplementation)
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
