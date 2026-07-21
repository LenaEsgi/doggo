import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

@inject()
export class HandleRobotStateChangedUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly missionTimeoutQueue: MissionTimeoutQueue,
    private readonly communicationService: RobotCommunicationService
  ) {}

  async execute(dogId: string, rawState: string): Promise<void> {
    const state = rawState as RobotDogState
    if (!Object.values(RobotDogState).includes(state)) {
      logger.warn({ dogId, rawState }, 'HandleRobotStateChanged: unknown state, ignoring')
      return
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      logger.warn({ dogId }, 'HandleRobotStateChanged: unknown robot, ignoring')
      return
    }

    if (state === RobotDogState.IN_MISSION) {
      const activeRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)

      if (!activeRun) {
        logger.warn(
          { dogId },
          'HandleRobotStateChanged: robot reports IN_MISSION without an active run (phantom mission), sending corrective STOP'
        )
        dog.applyStateFromRobot(RobotDogState.IDLE)
        await this.dogRepository.save(dog)
        void DogStateChangedEvent.dispatch(dogId, RobotDogState.IDLE)

        try {
          await this.communicationService.sendCommand(dogId, RobotCommand.STOP_MISSION)
        } catch (err) {
          logger.warn(
            { dogId, err },
            'HandleRobotStateChanged: corrective STOP failed (robot unreachable)'
          )
        }
        return
      }

      if (activeRun.status === MissionRunStatus.PENDING) {
        activeRun.confirm()
        await this.missionRunRepository.save(activeRun)
        await this.missionTimeoutQueue.cancel(activeRun.id.value)
      }
    }

    const previousState = dog.state
    dog.applyStateFromRobot(state)
    await this.dogRepository.save(dog)

    // Évite de re-notifier à chaque message si le robot répète le même état (ex: boucle
    // d'erreur qui renvoie ERROR en continu) - seule la transition compte.
    if (previousState !== state) {
      void DogStateChangedEvent.dispatch(dogId, state)
    }
  }
}
