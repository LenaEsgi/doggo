import type { ApplicationService } from '@adonisjs/core/types'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'
import { NotificationRepositoryImplementation } from '#app/modules/notifications/infrastructure/database/repositories/notification.repository.implementation'

export default class NotificationProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(NotificationRepository, () => {
      return this.app.container.make(NotificationRepositoryImplementation)
    })
  }

  async boot() {}
  async start() {}
  async ready() {}
  async shutdown() {}
}
