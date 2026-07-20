import type { ApplicationService } from '@adonisjs/core/types'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'
import { NotificationRepositoryImplementation } from '#app/modules/notifications/infrastructure/database/repositories/notification.repository.implementation'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import { TransmitRealtimeBroadcaster } from '#app/modules/notifications/infrastructure/realtime/transmit-realtime-broadcaster'
import { NotificationUserGateway } from '#app/modules/notifications/domain/gateways/notification-user.gateway'
import { NotificationUserGatewayImplementation } from '#app/modules/notifications/infrastructure/gateways/notification-user.gateway.implementation'

export default class NotificationProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(NotificationRepository, () => {
      return this.app.container.make(NotificationRepositoryImplementation)
    })
    this.app.container.bind(RealtimeBroadcaster, () => new TransmitRealtimeBroadcaster())
    this.app.container.bind(NotificationUserGateway, () => {
      return this.app.container.make(NotificationUserGatewayImplementation)
    })
  }

  async boot() {}
  async start() {}
  async ready() {}
  async shutdown() {}
}
