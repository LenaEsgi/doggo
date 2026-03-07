import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { UpdateMissionDto } from '../dto/update-mission.dto.js'
import { inject } from '@adonisjs/core'
import { UpdateMissionUseCase } from '../contracts/update-mission.use-case.js'
import logger from '@adonisjs/core/services/logger'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'

@inject()
export class UpdateMissionUseCaseImplementation implements UpdateMissionUseCase {
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
