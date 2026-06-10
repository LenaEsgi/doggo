import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

@inject()
export class IndexMyMissionsUseCase {
  constructor(private readonly missionRepository: MissionRepository) {}

  async execute(userId: string, params: PaginationDto): Promise<PaginatedResult<Mission>> {
    logger.info({ userId }, 'IndexMyMissionsUseCase started')
    return this.missionRepository.findByUser(userId, params)
  }
}
