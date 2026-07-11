import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

@inject()
export class IndexAllMissionsUseCase {
  constructor(private readonly missionRepository: MissionRepository) {}

  async execute(params: PaginationDto): Promise<PaginatedResult<Mission>> {
    logger.info({}, 'IndexAllMissionsUseCase started')
    return this.missionRepository.findAll(params)
  }
}
