import { inject } from '@adonisjs/core'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'
import type { SyncMissionStepsDto } from '#app/modules/missions/application/dto/sync-mission-steps.dto'

@inject()
export class SyncMissionStepsUseCase {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly actionRepository: ActionRepository
  ) {}

  async execute(dto: SyncMissionStepsDto): Promise<Mission> {
    const mission = await this.missionRepository.findById(MissionId.fromString(dto.missionId))

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    // Valider les paramètres de chaque step contre le schema de l'action.
    // On charge les actions distinctes une seule fois pour éviter N requêtes.
    const distinctActionIds = [...new Set(dto.steps.map((s) => s.actionId).filter(Boolean))]

    for (const actionId of distinctActionIds) {
      const action = await this.actionRepository.findById(ActionId.fromString(actionId))

      if (!action) {
        throw new ActionNotFoundError(actionId)
      }

      // Valider tous les steps qui utilisent cette action
      for (const step of dto.steps.filter((s) => s.actionId === actionId)) {
        action.validateParameters(step.parameters)
      }
    }

    mission.syncSteps(dto.steps)
    await this.missionRepository.save(mission)

    return mission
  }
}
