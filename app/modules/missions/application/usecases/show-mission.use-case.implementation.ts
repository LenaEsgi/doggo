import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { inject } from '@adonisjs/core'
import { ShowMissionUseCase } from '../contracts/show-mission.use-case.js'
import logger from '@adonisjs/core/services/logger'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

@inject()
export class ShowMissionUseCaseImplementation implements ShowMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(id: string): Promise<Mission> {
    const missionId = MissionId.fromString(id)

    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new Error('Mission not found')
    }
    logger.info('ShowMissionUseCase started', { id })

    return mission
  }
}
