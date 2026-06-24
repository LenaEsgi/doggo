import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'

// Stub — sera câblé dans start/events.ts quand MissionStartedEvent existera
@inject()
export default class MissionStartedSseListener {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: { userId: string; missionId: string; missionName: string }): Promise<void> {
    try {
      await this.notificationService.create(event.userId, 'mission.started', 'info', { missionName: event.missionName })
      logger.info({ userId: event.userId }, 'MissionStartedSseListener: notification created')
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'MissionStartedSseListener: failed')
    }
  }
}
