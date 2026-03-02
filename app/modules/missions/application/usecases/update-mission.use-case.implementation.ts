
import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { UpdateMissionDto } from '../dto/update-mission.dto.js'
import { MissionOutputDto } from '../dto/mission.output.dto.js'
import { inject } from '@adonisjs/core'
import { UpdateMissionUseCase } from '../contracts/update-mission.use-case.js'
import logger from '@adonisjs/core/services/logger'

@inject()
export class UpdateMissionUseCaseImplementation implements UpdateMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dto: UpdateMissionDto): Promise<MissionOutputDto> {
    logger.info('UpdateMissionUseCase started', { dto })
    return null as any
  }
}