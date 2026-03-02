
import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { ShowMissionDto } from '../dto/show-mission.dto.js'
import { MissionOutputDto } from '../dto/mission.output.dto.js'
import { inject } from '@adonisjs/core'
import { ShowMissionUseCase } from '../contracts/show-mission.use-case.js'
import logger from '@adonisjs/core/services/logger'

@inject()
export class ShowMissionUseCaseImplementation implements ShowMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(id: ShowMissionDto): Promise<MissionOutputDto> {
    logger.info('ShowMissionUseCase started', { id })
    return null as any
  }
}