import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type MissionAutoInterruptedEvent from '#app/modules/missions/domain/events/mission-auto-interrupted.event'

@inject()
export default class MissionAutoInterruptedSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async handle(event: MissionAutoInterruptedEvent): Promise<void> {
    try {
      const ownerIds = await this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(
        event.robotDogId
      )

      await this.notificationService.createBulk(
        ownerIds,
        'mission.interrupted',
        'critical',
        {
          missionName: event.missionName,
          reason: event.reason,
        },
        event.robotDogId
      )
      logger.info(
        { missionId: event.missionId, robotDogId: event.robotDogId, reason: event.reason, ownerCount: ownerIds.length },
        'MissionAutoInterruptedSseListener: notifications created'
      )
    } catch (error) {
      logger.error(
        { err: error, missionId: event.missionId },
        'MissionAutoInterruptedSseListener: failed'
      )
    }
  }
}
