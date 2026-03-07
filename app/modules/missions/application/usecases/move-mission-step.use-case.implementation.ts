import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MoveMissionStepDto } from '#app/modules/missions/application/dto/move-mission-step.dto'
import { MoveMissionStepUseCase } from '#app/modules/missions/application/contracts/move-mission-step.use-case'

@inject()
export class MoveMissionStepUseCaseImplementation implements MoveMissionStepUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dto: MoveMissionStepDto): Promise<void> {
    logger.info('MoveMissionStepUseCaseImplementation started', { dto })

    const missionId = MissionId.fromString(dto.missionId)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(missionId.value)
    }

    mission.moveStep(MissionStepId.fromString(dto.stepId), dto.newOrder)
    await this.missionRepository.save(mission)
  }
}
