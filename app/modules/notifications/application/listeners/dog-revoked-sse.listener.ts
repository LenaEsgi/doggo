import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import type OwnershipRevokedEvent from '#users/ownerships/domain/events/ownership-revoked.event'

export default class DogRevokedSseListener {
  async handle(event: OwnershipRevokedEvent): Promise<void> {
    try {
      transmit.broadcast(`users/${event.userId}`, {
        type: 'dog.revoked',
        robotDogId: event.robotDogId,
      })
      logger.info(
        { userId: event.userId, robotDogId: event.robotDogId },
        'DogRevokedSseListener: broadcasted'
      )
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'DogRevokedSseListener: broadcast failed')
    }
  }
}
