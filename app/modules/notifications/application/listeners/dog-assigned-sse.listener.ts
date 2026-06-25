import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import type OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'

@inject()
export default class DogAssignedSseListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly userGateway: UserOwnershipGateway,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async handle(event: OwnershipAssignedEvent): Promise<void> {
    try {
      const [dogs, assignedUsers, allOwnerIds] = await Promise.all([
        this.robotDogGateway.findByIds([event.robotDogId]),
        this.userGateway.findByIds([event.userId]),
        this.ownershipReadRepository.findAllActiveUserIdsByRobotDogId(event.robotDogId),
      ])

      const robotDogName = dogs[0]?.name ?? 'Robot'
      const assignedUser = assignedUsers[0]
      const memberName = assignedUser
        ? `${assignedUser.firstname} ${assignedUser.lastname}`
        : 'Un utilisateur'

      const coOwnerIds = allOwnerIds.filter((id) => id !== event.userId)

      await Promise.all([
        this.notificationService.create(event.userId, 'dog.assigned', 'info', { robotDogName }, event.robotDogId),
        this.notificationService.createBulk(coOwnerIds, 'dog.member.assigned', 'info', { robotDogName, memberName }, event.robotDogId),
      ])

      logger.info(
        { userId: event.userId, robotDogId: event.robotDogId, coOwnerCount: coOwnerIds.length },
        'DogAssignedSseListener: notifications created'
      )
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'DogAssignedSseListener: failed')
    }
  }
}
