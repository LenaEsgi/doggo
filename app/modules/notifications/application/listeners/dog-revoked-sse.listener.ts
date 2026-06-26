import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import type OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'

@inject()
export default class DogRevokedSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly userGateway: UserOwnershipGateway,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async handle(event: OwnershipRevokedEvent): Promise<void> {
    try {
      // The ownership is already closed before this event fires, so
      // findAllActiveUserIdsByRobotDogId returns only the remaining owners.
      const [dogs, revokedUsers, remainingOwnerIds] = await Promise.all([
        this.robotDogGateway.findByIds([event.robotDogId]),
        this.userGateway.findByIds([event.userId]),
        this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(event.robotDogId),
      ])

      const robotDogName = dogs[0]?.name ?? 'Robot'
      const revokedUser = revokedUsers[0]
      const memberName = revokedUser
        ? `${revokedUser.firstname} ${revokedUser.lastname}`
        : 'Un utilisateur'

      await Promise.all([
        this.notificationService.create(
          event.userId,
          'dog.revoked',
          'warning',
          { robotDogName },
          event.robotDogId
        ),
        this.notificationService.createBulk(
          remainingOwnerIds,
          'dog.member.revoked',
          'info',
          { robotDogName, memberName },
          event.robotDogId
        ),
      ])

      logger.info(
        {
          userId: event.userId,
          robotDogId: event.robotDogId,
          remainingOwnerCount: remainingOwnerIds.length,
        },
        'DogRevokedSseListener: notifications created'
      )
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'DogRevokedSseListener: failed')
    }
  }
}
