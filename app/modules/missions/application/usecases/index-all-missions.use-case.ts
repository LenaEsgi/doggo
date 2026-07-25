import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { UserGateway } from '#app/modules/missions/application/contracts/user.gateway'
import type { MissionWithCreatorDto } from '#app/modules/missions/application/dto/mission-with-creator.dto'

@inject()
export class IndexAllMissionsUseCase {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly userGateway: UserGateway
  ) {}

  async execute(params: PaginationDto): Promise<PaginatedResult<MissionWithCreatorDto>> {
    logger.info({}, 'IndexAllMissionsUseCase started')
    const result = await this.missionRepository.findAll(params)

    const uniqueUserIds = [...new Set(result.data.map((mission) => mission.userId))]
    const creators = await this.userGateway.findManyBy(uniqueUserIds)
    const creatorsById = new Map(creators.map((creator) => [creator.id, creator]))

    return {
      data: result.data.map((mission) => ({
        mission,
        creator: creatorsById.get(mission.userId) ?? null,
      })),
      meta: result.meta,
    }
  }
}
