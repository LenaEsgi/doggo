import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { DestroyMissionDto } from '#app/modules/missions/application/dto/destroy-mission.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'

@inject()
export class DestroyMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dto: DestroyMissionDto): Promise<void> {
    logger.info('DestroyMissionUseCase started', { dto })

    const missionId = MissionId.fromString(dto.id)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(missionId.value)
    }

    await this.missionRepository.delete(mission.id)
  }
}
