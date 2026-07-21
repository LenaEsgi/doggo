import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type MissionRemovedFromDogEvent from '#app/modules/missions/domain/events/mission-removed-from-dog.event'

@inject()
export default class MissionRemovedFromDogSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async handle(event: MissionRemovedFromDogEvent): Promise<void> {
    try {
      const ownerIds = await this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(
        event.robotDogId
      )

      await this.notificationService.createBulk(
        ownerIds,
        'mission.removed_from_dog',
        'warning',
        { missionName: event.missionName, robotDogName: event.robotDogName },
        event.robotDogId
      )
      logger.info(
        { missionId: event.missionId, robotDogId: event.robotDogId, ownerCount: ownerIds.length },
        'MissionRemovedFromDogSseListener: notifications created'
      )
    } catch (error) {
      logger.error(
        { err: error, missionId: event.missionId },
        'MissionRemovedFromDogSseListener: failed'
      )
    }
  }
}
