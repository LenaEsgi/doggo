import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'
import DogRevokedMail from '#app/modules/notifications/infrastructure/mail/dog-revoked.mail'
import { maskEmail } from '#app/modules/share/utils/mask-email'

@inject()
export default class DogRevokedListener {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway
  ) {}

  protected async doSendMail(mailInstance: DogRevokedMail): Promise<void> {
    await mail.send(mailInstance)
  }

  async handle(event: OwnershipRevokedEvent): Promise<void> {
    try {
      logger.info(
        { userId: event.userId, robotDogId: event.robotDogId },
        'DogRevokedListener started'
      )

      const [users, dogs] = await Promise.all([
        this.userGateway.findByIds([event.userId]),
        this.robotDogGateway.findByIds([event.robotDogId]),
      ])

      const user = users[0]
      const robotDog = dogs[0]

      if (!user || !robotDog) {
        logger.warn(
          { userId: event.userId, robotDogId: event.robotDogId },
          'DogRevokedListener: user or dog not found, skipping mail'
        )
        return
      }

      await this.doSendMail(new DogRevokedMail(user, robotDog))
      logger.info({ to: maskEmail(user.email) }, 'DogRevokedListener: mail sent successfully')
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'DogRevokedListener: failed to send mail')
    }
  }
}
