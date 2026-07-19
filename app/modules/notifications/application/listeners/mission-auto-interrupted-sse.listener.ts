import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import type MissionAutoInterruptedEvent from '#app/modules/missions/domain/events/mission-auto-interrupted.event'

@inject()
export default class MissionAutoInterruptedSseListener {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: MissionAutoInterruptedEvent): Promise<void> {
    try {
      await this.notificationService.create(event.userId, 'mission.interrupted', 'critical', {
        missionName: event.missionName,
        reason: event.reason,
      })
      logger.info(
        { userId: event.userId, missionId: event.missionId, reason: event.reason },
        'MissionAutoInterruptedSseListener: notification created'
      )
    } catch (error) {
      logger.error(
        { err: error, userId: event.userId },
        'MissionAutoInterruptedSseListener: failed'
      )
    }
  }
}
