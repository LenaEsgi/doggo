import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { RobotDogWithOwnersSummaryDto } from '#dogs/application/DTO/robot-dog-with-owners-summary.dto'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'

@inject()
export class IndexRobotDogsUseCase {
  constructor(
    private readonly robotDogRepository: RobotDogRepository,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(params: PaginationDto): Promise<PaginatedResult<RobotDogWithOwnersSummaryDto>> {
    logger.info({}, 'IndexRobotDogsUseCase started')

    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(params.limit ?? 20, 100)

    logger.info({ page, limit }, 'page and limit')

    const { data, meta } = await this.robotDogRepository.findAll({
      page,
      limit,
      search: params.search,
    })
    const usersCountByDogId = await this.ownershipReadRepository.countActiveUsersByRobotDogIds(
      data.map((robotDog) => robotDog.id.value)
    )
    const result = data.map((robotDog) => ({
      robotDog,
      usersCount: usersCountByDogId[robotDog.id.value] ?? 0,
    }))

    logger.info({ count: result.length }, 'IndexRobotDogsUseCase completed successfully')

    return { data: result, meta }
  }
}
