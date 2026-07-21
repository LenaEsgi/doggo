import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

@inject()
export default class MissionCompletedSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async handle(event: MissionCompletedEvent): Promise<void> {
    const isSuccess = event.status === MissionRunStatus.SUCCESS
    const type = isSuccess ? 'mission.completed' : 'mission.failed'
    const severity = isSuccess ? 'success' : 'critical'

    try {
      const ownerIds = await this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(
        event.robotDogId
      )

      await this.notificationService.createBulk(
        ownerIds,
        type,
        severity,
        { missionName: event.missionName },
        event.robotDogId
      )
      logger.info(
        { robotDogId: event.robotDogId, type, ownerCount: ownerIds.length },
        'MissionCompletedSseListener: notifications created'
      )
    } catch (error) {
      logger.error({ err: error, missionId: event.missionId }, 'MissionCompletedSseListener: failed')
    }
  }
}
