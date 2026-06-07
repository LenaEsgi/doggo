import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { UserWithDogsSummaryDto } from '#users/application/dto/user-with-dogs-summary.dto'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'

@inject()
export class IndexUserUseCase {
  constructor(
    private readonly userRepository: UserReadRepository,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(params: PaginationDto): Promise<PaginatedResult<UserWithDogsSummaryDto>> {
    logger.info({}, 'IndexUserUseCase started')

    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(params.limit ?? 25, 100)

    const { data: users, meta } = await this.userRepository.findAll({ page, limit })
    const dogsCountByUserId = await this.ownershipReadRepository.countActiveDogsByUserIds(
      users.map((user) => user.id)
    )
    const result = users.map((user) => ({
      user,
      dogsCount: dogsCountByUserId[user.id] ?? 0,
    }))
    logger.info({ count: result.length }, 'IndexUserUseCase completed successfully')
    return { data: result, meta }
  }
}
