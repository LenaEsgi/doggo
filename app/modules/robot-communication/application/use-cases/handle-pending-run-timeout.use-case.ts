import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

@inject()
export class HandlePendingRunTimeoutUseCase {
  constructor(
    private readonly missionRunRepository: MissionRunRepository,
    private readonly dogRepository: RobotDogRepository
  ) {}

  async execute(runId: string, dogId: string): Promise<void> {
    const run = await this.missionRunRepository.findActiveRunByRobotDog(dogId)

    if (!run || run.id.value !== runId) {
      logger.info({ runId, dogId }, 'HandlePendingRunTimeout: run déjà confirmé ou annulé, ignoré')
      return
    }

    if (run.status !== MissionRunStatus.PENDING) {
      logger.info({ runId, dogId }, 'HandlePendingRunTimeout: run plus PENDING, ignoré')
      return
    }

    run.interrupt()
    await this.missionRunRepository.save(run)

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (dog) {
      dog.applyStateFromRobot(RobotDogState.IDLE)
      await this.dogRepository.save(dog)
    }

    void DogStateChangedEvent.dispatch(dogId, RobotDogState.IDLE)
    logger.warn(
      { runId, dogId },
      "HandlePendingRunTimeout: mission annulée — robot n'a pas confirmé dans les délais"
    )
  }
}
