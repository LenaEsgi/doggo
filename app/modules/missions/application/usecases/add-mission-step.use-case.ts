import { AddMissionStepDto } from '#app/modules/missions/application/dto/add-mission-step.dto'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionNotAvailableError } from '#app/modules/actions/domain/exceptions/action-not-available.error'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

@inject()
export class AddMissionStepUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private missionRunRepository: MissionRunRepository,
    private actionRepository: ActionRepository
  ) {}

  async execute(dto: AddMissionStepDto): Promise<void> {
    const missionId = MissionId.fromString(dto.missionId)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    const action = await this.actionRepository.findById(ActionId.fromString(dto.actionId))
    if (!action) {
      throw new ActionNotFoundError(dto.actionId)
    }
    if (!action.isActive) {
      throw new ActionNotAvailableError(dto.actionId)
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.addStep(dto.actionId, dto.parameters, hasActiveRun)

    await this.missionRepository.save(mission)

    logger.info('AddMissionStepUseCase completed successfully', {
      missionId: dto.missionId,
      actionId: dto.actionId,
    })
  }
}
