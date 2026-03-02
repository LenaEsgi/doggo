
import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { MissionOutputDto } from '../dto/mission.output.dto.js'
import { inject } from '@adonisjs/core'
import { IndexMissionUseCase } from '../contracts/index-mission.use-case.js'
import logger from '@adonisjs/core/services/logger'

@inject()
export class IndexMissionUseCaseImplementation implements IndexMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(params: PaginationDto): Promise<PaginatedResult<MissionOutputDto>> {
    logger.info('IndexMissionUseCase started', { params })
    return null as any
  }
}