import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { UpdateMissionDto } from '#app/modules/missions/application/dto/update-mission.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'

@inject()
export class UpdateMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dto: UpdateMissionDto): Promise<void> {
    logger.info('UpdateMissionUseCase started', { dto })
    const missionId = MissionId.fromString(dto.id)

    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(dto.id)
    }

    mission.rename(dto.name)

    await this.missionRepository.save(mission)
  }
}
