import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type RobotBatteryLowEvent from '#dogs/domain/events/robot-battery-low.event'

@inject()
export default class RobotBatteryLowSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async handle(event: RobotBatteryLowEvent): Promise<void> {
    try {
      const ownerIds = await this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(
        event.robotDogId
      )

      await this.notificationService.createBulk(
        ownerIds,
        'dog.battery_low',
        'warning',
        { robotDogName: event.robotDogName, batteryLevel: event.batteryLevel },
        event.robotDogId
      )
      logger.info(
        { robotDogId: event.robotDogId, batteryLevel: event.batteryLevel, ownerCount: ownerIds.length },
        'RobotBatteryLowSseListener: notifications created'
      )
    } catch (error) {
      logger.error({ err: error, robotDogId: event.robotDogId }, 'RobotBatteryLowSseListener: failed')
    }
  }
}
