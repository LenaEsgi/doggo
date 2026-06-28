import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'

@inject()
export class ShowMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(id: string): Promise<Mission> {
    const missionId = MissionId.fromString(id)

    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(id)
    }
    logger.info('ShowMissionUseCase started', { id })

    return mission
  }
}
