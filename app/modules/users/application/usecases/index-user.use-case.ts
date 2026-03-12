import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { UserWithDogsSummaryDto } from '#users/application/dto/user-with-dogs-summary.dto'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'

@inject()
export class IndexUserUseCase {
  constructor(
    private readonly userRepository: UserReadRepository,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(): Promise<UserWithDogsSummaryDto[]> {
    logger.info({}, 'IndexUserUseCase started')
    const users = await this.userRepository.findAll()
    const dogsCountByUserId = await this.ownershipReadRepository.countActiveDogsByUserIds(
      users.map((user) => user.id)
    )
    const result = users.map((user) => ({
      user,
      dogsCount: dogsCountByUserId[user.id] ?? 0,
    }))
    logger.info({ count: result.length }, 'IndexUserUseCase completed successfully')
    return result
  }
}
