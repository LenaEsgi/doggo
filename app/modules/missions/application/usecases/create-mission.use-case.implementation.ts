
import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { CreateMissionDto } from '../dto/create-mission.dto.js'
import { inject } from '@adonisjs/core'
import { CreateMissionUseCase } from '../contracts/create-mission.use-case.js'
import logger from '@adonisjs/core/services/logger'
import { MissionStep } from '#app/modules/missions/domain/entities/mission-step.entity'

@inject()
export class CreateMissionUseCaseImplementation implements CreateMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dto: CreateMissionDto) {
    logger.info('CreateMissionUseCase started', { dto })
  }
}
