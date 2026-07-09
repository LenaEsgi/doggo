import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import type DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

export default class DogStateChangedSseListener {
  async handle(event: DogStateChangedEvent): Promise<void> {
    try {
      transmit.broadcast(`dogs/${event.dogId}`, {
        type: 'robot.state_changed',
        dogId: event.dogId,
        state: event.state,
      } as unknown as Parameters<typeof transmit.broadcast>[1])
    } catch (error) {
      logger.error({ err: error, dogId: event.dogId }, 'DogStateChangedSseListener: broadcast failed')
    }
  }
}
