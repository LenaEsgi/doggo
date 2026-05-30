import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { CreateMissionDto } from '../dto/create-mission.dto.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

@inject()
export class CreateMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dto: CreateMissionDto) {
    logger.info('CreateMissionUseCase started', { dto })

    const mission = Mission.create(dto.name, dto.userId)
    await this.missionRepository.save(mission)
  }
}
