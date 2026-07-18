import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import type MissionStepUpdatedEvent from '#app/modules/missions/domain/events/mission-step-updated.event'

export default class MissionStepUpdatedSseListener {
  async handle(event: MissionStepUpdatedEvent): Promise<void> {
    try {
      transmit.broadcast(`missions/${event.missionId}`, {
        type: 'robot.mission_step',
        missionId: event.missionId,
        robotDogId: event.robotDogId,
        stepId: event.stepId,
        stepStatus: event.stepStatus,
        runStatus: event.runStatus,
      } as unknown as Parameters<typeof transmit.broadcast>[1])
    } catch (error) {
      logger.error(
        { err: error, missionId: event.missionId },
        'MissionStepUpdatedSseListener: broadcast failed'
      )
    }
  }
}
