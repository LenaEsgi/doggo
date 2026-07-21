import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type MissionStartFailedEvent from '#app/modules/missions/domain/events/mission-start-failed.event'

@inject()
export default class MissionStartFailedSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async handle(event: MissionStartFailedEvent): Promise<void> {
    try {
      const ownerIds = await this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(
        event.robotDogId
      )

      await this.notificationService.createBulk(
        ownerIds,
        'mission.start_failed',
        'critical',
        {
          missionName: event.missionName,
          robotDogName: event.robotDogName,
          reason: event.reason,
        },
        event.robotDogId
      )
      logger.info(
        {
          missionId: event.missionId,
          robotDogId: event.robotDogId,
          reason: event.reason,
          ownerCount: ownerIds.length,
        },
        'MissionStartFailedSseListener: notifications created'
      )
    } catch (error) {
      logger.error(
        { err: error, missionId: event.missionId },
        'MissionStartFailedSseListener: failed'
      )
    }
  }
}
