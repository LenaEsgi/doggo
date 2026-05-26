import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'

export default class DogAssignedSseListener {
  async handle(event: OwnershipAssignedEvent): Promise<void> {
    try {
      transmit.broadcast(`users/${event.userId}`, {
        type: 'dog.assigned',
        robotDogId: event.robotDogId,
      })
      logger.info({ userId: event.userId, robotDogId: event.robotDogId }, 'DogAssignedSseListener: broadcasted')
    } catch (error) {
      logger.error({ err: error, userId: event.userId }, 'DogAssignedSseListener: broadcast failed')
    }
  }
}
