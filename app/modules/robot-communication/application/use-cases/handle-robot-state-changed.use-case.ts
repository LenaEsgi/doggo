import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

@inject()
export class HandleRobotStateChangedUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly missionTimeoutQueue: MissionTimeoutQueue
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

    dog.applyStateFromRobot(state)
    await this.dogRepository.save(dog)

    if (state === RobotDogState.IN_MISSION) {
      const pendingRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)
      if (pendingRun && pendingRun.status === MissionRunStatus.PENDING) {
        pendingRun.confirm()
        await this.missionRunRepository.save(pendingRun)
        await this.missionTimeoutQueue.cancel(pendingRun.id.value)
      }
    }

    void DogStateChangedEvent.dispatch(dogId, state)
  }
}
