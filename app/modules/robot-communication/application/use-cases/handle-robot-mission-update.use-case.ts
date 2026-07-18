import { inject } from '@adonisjs/core'
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
import { UnitOfWork } from '#app/modules/share/domain/contracts/unit-of-work'

@inject()
export class HandleRobotMissionUpdateUseCase {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly dogRepository: RobotDogRepository,
    private readonly uow: UnitOfWork
  ) {}

  async execute(dogId: string, update: RobotMissionUpdate): Promise<void> {
    const outcome = await this.uow.run(async (tx) => {
      const run = await this.missionRunRepository.findActiveRunForUpdate(
        update.missionId,
        dogId,
        tx
      )
      if (!run || run.status === MissionRunStatus.PENDING) return null

      const stepId = MissionStepId.fromString(update.stepId)

      let transitioned: MissionStepId[]
      if (update.status === MissionStepStatus.COMPLETED) {
        transitioned = run.completeStep(stepId)
      } else if (update.status === MissionStepStatus.FAILED) {
        transitioned = run.failStep(stepId)
      } else {
        return null
      }

      await this.missionRunRepository.save(run, tx)

      if (run.isTerminal) {
        const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
        if (dog) {
          dog.applyStateFromRobot(RobotDogState.IDLE)
          await this.dogRepository.save(dog, tx)
        }
      }

      return { runStatus: run.status, transitioned, terminal: run.isTerminal }
    })

    if (!outcome) return

    // un event par étape passée à COMPLETED (cible + trous rattrapés)
    for (const id of outcome.transitioned) {
      void MissionStepUpdatedEvent.dispatch(
        update.missionId,
        dogId,
        id.value,
        MissionStepStatus.COMPLETED,
        outcome.runStatus
      )
    }

    // puis l'event FAILED de la cible, le cas échéant
    if (update.status === MissionStepStatus.FAILED) {
      void MissionStepUpdatedEvent.dispatch(
        update.missionId,
        dogId,
        update.stepId,
        MissionStepStatus.FAILED,
        outcome.runStatus
      )
    }

    if (!outcome.terminal) {
      return
    }

    void DogStateChangedEvent.dispatch(dogId, RobotDogState.IDLE)

    if (
      outcome.runStatus === MissionRunStatus.SUCCESS ||
      outcome.runStatus === MissionRunStatus.FAILED
    ) {
      const mission = await this.missionRepository.findById(MissionId.fromString(update.missionId))
      if (mission) {
        void MissionCompletedEvent.dispatch(
          mission.userId,
          update.missionId,
          mission.name,
          dogId,
          outcome.runStatus
        )
      }
    }
  }
}
