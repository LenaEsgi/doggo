import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'

// Stub — sera câblé dans start/events.ts quand MissionCompletedEvent existera
@inject()
export default class MissionCompletedSseListener {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: { userId: string; missionId: string; missionName: string }): Promise<void> {
    try {
      await this.notificationService.create(event.userId, 'mission.completed', 'success', { missionName: event.missionName })
      logger.info({ userId: event.userId }, 'MissionCompletedSseListener: notification created')
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'MissionCompletedSseListener: failed')
    }
  }
}
