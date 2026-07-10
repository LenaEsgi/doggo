import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import {
  RobotCommand,
  type RobotCommandStep,
} from '#app/modules/robot-communication/domain/types/robot-command.type'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionTimeoutQueue } from '#app/modules/missions/domain/contracts/mission-timeout-queue'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'

const PENDING_RUN_TIMEOUT_MS = 60_000

@inject()
export class StartMissionCommandUseCase {
  readonly command = RobotCommand.START_MISSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService,
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly missionTimeoutQueue: MissionTimeoutQueue,
    private readonly actionRepository: ActionRepository
  ) {}

  async execute(dogId: string, missionId?: string): Promise<MissionRun> {
    if (!missionId) {
      throw new InvalidRobotCommandError('missionId is required for START_MISSION command')
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    const existingRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)
    if (existingRun) {
      throw new InvalidMissionAlreadyRunningError()
    }

    const isAssigned = await this.missionRepository.isAssignedToDog(missionId, dogId)
    if (!isAssigned) {
      throw new MissionNotAssignedToRobotError(missionId, dogId)
    }

    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) {
      throw new MissionNotFoundError(missionId)
    }

    dog.validateForMission()

    // Résout le plan dénormalisé AVANT de créer le run : si une action référencée
    // n'existe plus, on échoue vite sans laisser d'artefact (run/timeout) en base.
    const steps = await this.buildRobotSteps(mission)

    const run = MissionRun.start(
      mission.id,
      dog.id,
      mission.getStepsInOrder().map((step) => step.id)
    )

    // On persiste d'abord (source de vérité, réversible) puis on arme le filet de sécurité,
    // et on publie l'ordre au robot EN DERNIER car c'est la seule action irréversible.
    // Si l'armement du timeout ou la publication échoue, on compense : le run n'a jamais
    // démarré côté robot, donc on le marque LAUNCH_FAILED (état terminal non-actif) et on
    // annule le timeout éventuel. Aucun run PENDING orphelin ne subsiste → relance possible.
    await this.missionRunRepository.save(run)

    try {
      await this.missionTimeoutQueue.schedule(run.id.value, dogId, PENDING_RUN_TIMEOUT_MS)
      await this.communicationService.sendCommand(dogId, this.command, {
        runId: run.id.value,
        missionId,
        steps,
      })
    } catch (error) {
      await this.missionTimeoutQueue.cancel(run.id.value)
      run.markLaunchFailed()
      await this.missionRunRepository.save(run)
      throw error
    }

    return run
  }

  private async buildRobotSteps(mission: Mission): Promise<RobotCommandStep[]> {
    const steps: RobotCommandStep[] = []
    for (const step of mission.getStepsInOrder()) {
      const action = await this.actionRepository.findById(ActionId.fromString(step.actionId))
      if (!action) {
        throw new ActionNotFoundError(step.actionId)
      }
      steps.push({
        stepId: step.id.value,
        order: step.order,
        actionCode: action.code,
        parameters: this.parseParameters(step.parameters),
      })
    }
    return steps
  }

  private parseParameters(raw: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // paramètres non-JSON → objet vide : le robot reçoit {} plutôt qu'une string brute
    }
    return {}
  }
}
