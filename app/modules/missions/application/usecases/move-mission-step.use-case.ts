import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MoveMissionStepDto } from '#app/modules/missions/application/dto/move-mission-step.dto'

@inject()
export class MoveMissionStepUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private missionRunRepository: MissionRunRepository
  ) {}

  async execute(dto: MoveMissionStepDto): Promise<void> {
    logger.info('MoveMissionStepUseCase started', { dto })

    const missionId = MissionId.fromString(dto.missionId)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(missionId.value)
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.moveStep(MissionStepId.fromString(dto.stepId), dto.newOrder, hasActiveRun)
    await this.missionRepository.save(mission)
  }
}
