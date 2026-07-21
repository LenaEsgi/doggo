import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type MissionAssignedToDogEvent from '#app/modules/missions/domain/events/mission-assigned-to-dog.event'

@inject()
export default class MissionAssignedToDogSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async handle(event: MissionAssignedToDogEvent): Promise<void> {
    try {
      const ownerIds = await this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(
        event.robotDogId
      )

      await this.notificationService.createBulk(
        ownerIds,
        'mission.assigned_to_dog',
        'info',
        { missionName: event.missionName, robotDogName: event.robotDogName },
        event.robotDogId
      )
      logger.info(
        { missionId: event.missionId, robotDogId: event.robotDogId, ownerCount: ownerIds.length },
        'MissionAssignedToDogSseListener: notifications created'
      )
    } catch (error) {
      logger.error(
        { err: error, missionId: event.missionId },
        'MissionAssignedToDogSseListener: failed'
      )
    }
  }
}
