import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotDog } from '#dogs/domain/robot-dog.entity'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { UnitOfWork } from '#app/modules/share/domain/contracts/unit-of-work'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'

@inject()
export class StopMissionCommandUseCase {
  readonly command = RobotCommand.STOP_MISSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly uow: UnitOfWork,
    private readonly timeoutQueue: MissionTimeoutQueue
  ) {}

  async execute(dogId: string): Promise<RobotDog> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    const preRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)
    if (!preRun) {
      throw new NoActiveMissionRunError(dogId)
    }
    const wasPending = preRun.status === MissionRunStatus.PENDING

    try {
      await this.communicationService.sendCommand(dogId, this.command)
    } catch (error) {
      logger.error(
        {
          runId: preRun.id.value,
          dogId,
          reason: error instanceof Error ? error.message : String(error),
        },
        'StopMissionCommandUseCase failed to send stop command to robot'
      )
      throw error
    }

    await this.uow.run(async (tx) => {
      const run = await this.missionRunRepository.findActiveRunByRobotDogForUpdate(dogId, tx)
      if (!run) {
        throw new NoActiveMissionRunError(dogId)
      }
      run.interrupt()
      dog.applyStateFromRobot(RobotDogState.IDLE)
      await this.missionRunRepository.save(run, tx)
      await this.dogRepository.save(dog, tx)
    })

    if (wasPending) {
      await this.timeoutQueue.cancel(preRun.id.value)
    }
    logger.info({ runId: preRun.id.value, dogId }, 'StopMissionCommandUseCase mission stopped')
    void DogStateChangedEvent.dispatch(dog.id.toString(), dog.state)

    return dog
  }
}
