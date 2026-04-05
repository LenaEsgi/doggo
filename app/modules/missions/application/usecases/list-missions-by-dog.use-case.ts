import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

@inject()
export class ListMissionsByDogUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dogId: string, params: PaginationDto): Promise<PaginatedResult<Mission>> {
    logger.info('ListMissionsByDogUseCase started', { dogId, params })
    return this.missionRepository.listByRobotDog(dogId, params)
  }
}
