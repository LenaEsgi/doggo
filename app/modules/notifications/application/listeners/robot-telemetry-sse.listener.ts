import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import type RobotTelemetryReceivedEvent from '#dogs/domain/events/robot-telemetry-received.event'

export default class RobotTelemetrySseListener {
  async handle(event: RobotTelemetryReceivedEvent): Promise<void> {
    try {
      transmit.broadcast(`dogs/${event.dogId}`, {
        type: 'robot.telemetry',
        dogId: event.dogId,
        battery: event.battery,
        state: event.state,
      } as unknown as Parameters<typeof transmit.broadcast>[1])
    } catch (error) {
      logger.error(
        { err: error, dogId: event.dogId },
        'RobotTelemetrySseListener: broadcast failed'
      )
    }
  }
}
