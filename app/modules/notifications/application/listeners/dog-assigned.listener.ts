import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
import DogAssignedMail from '#app/modules/notifications/infrastructure/mail/dog-assigned.mail'

@inject()
export class DogAssignedListener {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly sendMail: typeof mail.send = mail.send.bind(mail)
  ) {}

  async handle(event: OwnershipAssignedEvent): Promise<void> {
    logger.info({ userId: event.userId, robotDogId: event.robotDogId }, 'DogAssignedListener started')

    const [users, dogs] = await Promise.all([
      this.userGateway.findByIds([event.userId]),
      this.robotDogGateway.findByIds([event.robotDogId]),
    ])

    const user = users[0]
    const robotDog = dogs[0]

    if (!user || !robotDog) {
      logger.warn(
        { userId: event.userId, robotDogId: event.robotDogId },
        'DogAssignedListener: user or dog not found, skipping mail'
      )
      return
    }

    try {
      await this.sendMail(new DogAssignedMail(user, robotDog))
      logger.info({ to: user.email }, 'DogAssignedListener: mail sent successfully')
    } catch (error) {
      logger.error({ error, userId: event.userId }, 'DogAssignedListener: failed to send mail')
    }
  }
}
