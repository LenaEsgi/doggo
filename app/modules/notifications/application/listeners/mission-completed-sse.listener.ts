import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import type MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

@inject()
export default class MissionCompletedSseListener {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: MissionCompletedEvent): Promise<void> {
    const isSuccess = event.status === MissionRunStatus.SUCCESS
    const type = isSuccess ? 'mission.completed' : 'mission.failed'
    const severity = isSuccess ? 'success' : 'critical'

    try {
      await this.notificationService.create(event.userId, type, severity, {
        missionName: event.missionName,
      })
      logger.info(
        { userId: event.userId, type },
        'MissionCompletedSseListener: notification created'
      )
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'MissionCompletedSseListener: failed')
    }
  }
}
