
import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { DestroyMissionDto } from '../dto/destroy-mission.dto.js'
import { inject } from '@adonisjs/core'
import { DestroyMissionUseCase } from '../contracts/destroy-mission.use-case.js'
import logger from '@adonisjs/core/services/logger'

@inject()
export class DestroyMissionUseCaseImplementation implements DestroyMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dto: DestroyMissionDto): Promise<void> {
    logger.info('DestroyMissionUseCase started', { dto })
  }
}