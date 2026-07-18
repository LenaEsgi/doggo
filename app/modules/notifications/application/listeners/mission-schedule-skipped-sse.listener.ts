import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import type MissionScheduleSkippedEvent from '#app/modules/missions/domain/events/mission-schedule-skipped.event'

@inject()
export default class MissionScheduleSkippedSseListener {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: MissionScheduleSkippedEvent): Promise<void> {
    try {
      await this.notificationService.create(event.userId, 'mission.skipped', 'warning', {
        missionName: event.missionName,
      })
      logger.info(
        { userId: event.userId, missionScheduleId: event.missionScheduleId },
        'MissionScheduleSkippedSseListener: notification created'
      )
    } catch (error) {
      logger.error(
        { err: error, userId: event.userId },
        'MissionScheduleSkippedSseListener: failed'
      )
    }
  }
}
