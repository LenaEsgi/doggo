import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { UnitOfWork } from '#app/modules/share/domain/contracts/unit-of-work'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'
import MissionAutoInterruptedEvent from '#app/modules/missions/domain/events/mission-auto-interrupted.event'
import robotConfig from '#config/robot'

type InterruptReason = 'ROBOT_OFFLINE' | 'MAX_DURATION'

/**
 * Sweep périodique (C2) : déclare OFFLINE les robots silencieux et interrompt les
 * missions en cours devenues orphelines (robot muet) ou anormalement longues
 * (robot vivant mais run qui traîne), pour qu'un robot ne reste jamais bloqué.
 */
@inject()
export class SweepStaleRobotRunsUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly missionRepository: MissionRepository,
    private readonly uow: UnitOfWork,
    private readonly timeoutQueue: MissionTimeoutQueue
  ) {}

  async execute(now: Date): Promise<void> {
    // (a) chiens muets → OFFLINE
    const stale = await this.dogRepository.findStale(
      new Date(now.getTime() - robotConfig.offlineThresholdMs)
    )
    for (const dog of stale) {
      dog.checkHeartbeatTimeout(now)
      await this.dogRepository.save(dog)
      void DogStateChangedEvent.dispatch(dog.id.value, dog.state)
    }

    // (b)+(c) runs à interrompre
    for (const run of await this.missionRunRepository.listActiveRuns()) {
      if (run.status !== MissionRunStatus.RUNNING) continue

      const dog = await this.dogRepository.findById(run.robotDogId)
      const robotStale =
        !!dog && now.getTime() - dog.lastHeartbeat.getTime() > robotConfig.runStaleGraceMs
      const tooLong = now.getTime() - run.startedAt.getTime() > robotConfig.runMaxDurationMs

      if (!robotStale && !tooLong) continue

      const reason: InterruptReason = robotStale ? 'ROBOT_OFFLINE' : 'MAX_DURATION'
      await this.interrupt(run.robotDogId.value, reason)
    }
  }

  private async interrupt(dogId: string, reason: InterruptReason): Promise<void> {
    // robot vivant mais mission trop longue → lui demander de s'arrêter (best-effort,
    // avant toute écriture DB ; le robot exécute peut-être encore la mission)
    if (reason === 'MAX_DURATION') {
      try {
        await this.communicationService.sendCommand(dogId, RobotCommand.STOP_MISSION)
      } catch (err) {
        logger.warn({ dogId, err }, 'Sweep: STOP correctif échoué (robot injoignable)')
      }
    }

    const nextDogState = reason === 'ROBOT_OFFLINE' ? RobotDogState.OFFLINE : RobotDogState.IDLE

    const result = await this.uow.run(async (tx) => {
      const run = await this.missionRunRepository.findActiveRunByRobotDogForUpdate(dogId, tx)
      if (!run || run.status !== MissionRunStatus.RUNNING) return null

      run.interrupt()

      const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
      if (dog) {
        dog.applyStateFromRobot(nextDogState)
        await this.dogRepository.save(dog, tx)
      }

      await this.missionRunRepository.save(run, tx)

      return { runId: run.id.value, missionId: run.missionId.value }
    })

    if (!result) return

    await this.timeoutQueue.cancel(result.runId)

    const mission = await this.missionRepository.findById(MissionId.fromString(result.missionId))
    if (mission) {
      void MissionAutoInterruptedEvent.dispatch(result.missionId, mission.name, dogId, reason)
    }
    void DogStateChangedEvent.dispatch(dogId, nextDogState)
  }
}
