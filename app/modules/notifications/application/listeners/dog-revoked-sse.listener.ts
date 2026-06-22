import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import type OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'

@inject()
export default class DogRevokedSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly robotDogGateway: RobotDogOwnershipGateway
  ) {}

  async handle(event: OwnershipRevokedEvent): Promise<void> {
    try {
      const dogs = await this.robotDogGateway.findByIds([event.robotDogId])
      const robotDogName = dogs[0]?.name ?? 'Robot'

      await this.notificationService.create(
        event.userId,
        'dog.revoked',
        { robotDogName },
        event.robotDogId
      )
      logger.info({ userId: event.userId, robotDogId: event.robotDogId }, 'DogRevokedSseListener: notification created')
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'DogRevokedSseListener: failed')
    }
  }
}
