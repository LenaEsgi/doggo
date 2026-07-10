import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import MissionStepUpdatedEvent from '#app/modules/missions/domain/events/mission-step-updated.event'
import MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'
import { type RobotMissionUpdate } from '#app/modules/robot-communication/domain/types/robot-mission-update.type'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

@inject()
export class HandleRobotMissionUpdateUseCase {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly dogRepository: RobotDogRepository
  ) {}

  async execute(dogId: string, update: RobotMissionUpdate): Promise<void> {
    const run = await this.missionRunRepository.findActiveRun(update.missionId, dogId)

    if (!run) {
      logger.warn(
        { missionId: update.missionId, dogId },
        'HandleRobotMissionUpdate: no active run found'
      )
      return
    }

    if (run.status === MissionRunStatus.PENDING) {
      logger.warn(
        { missionId: update.missionId, dogId },
        'HandleRobotMissionUpdate: run encore PENDING, step update ignoré'
      )
      return
    }

    const stepId = MissionStepId.fromString(update.stepId)

    let completedStepIds: MissionStepId[]
    if (update.status === MissionStepStatus.COMPLETED) {
      completedStepIds = run.completeStep(stepId)
    } else if (update.status === MissionStepStatus.FAILED) {
      completedStepIds = run.failStep(stepId)
    } else {
      return
    }

    await this.missionRunRepository.save(run)

    // un event par étape passée à COMPLETED (cible + trous rattrapés)
    for (const completedStepId of completedStepIds) {
      void MissionStepUpdatedEvent.dispatch(
        update.missionId,
        dogId,
        completedStepId.value,
        MissionStepStatus.COMPLETED,
        run.status
      )
    }

    // puis l'event FAILED de la cible, le cas échéant
    if (update.status === MissionStepStatus.FAILED) {
      void MissionStepUpdatedEvent.dispatch(
        update.missionId,
        dogId,
        update.stepId,
        MissionStepStatus.FAILED,
        run.status
      )
    }

    if (!run.isTerminal) {
      return
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (dog) {
      dog.applyStateFromRobot(RobotDogState.IDLE)
      await this.dogRepository.save(dog)
      void DogStateChangedEvent.dispatch(dog.id.toString(), dog.state)
    }

    if (run.status === MissionRunStatus.SUCCESS || run.status === MissionRunStatus.FAILED) {
      const mission = await this.missionRepository.findById(MissionId.fromString(update.missionId))
      if (mission) {
        void MissionCompletedEvent.dispatch(mission.userId, update.missionId, mission.name, dogId, run.status)
      }
    }
  }
}
