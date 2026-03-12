import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { UserWithDogsSummaryDto } from '#users/application/dto/user-with-dogs-summary.dto'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class ShowUserUseCase {
  constructor(
    private readonly userRepository: UserReadRepository,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(id: string): Promise<UserWithDogsSummaryDto> {
    logger.info({ userId: id }, 'ShowUserUseCase started')
    const user = await this.userRepository.findById(id)

    if (!user) {
      logger.warn({ userId: id }, 'User not found in ShowUserUseCase')
      throw new InvalidUserNotFoundError(id)
    }

    logger.info({ userId: id }, 'ShowUserUseCase completed successfully')
    const dogsCountByUserId = await this.ownershipReadRepository.countActiveDogsByUserIds([id])
    return {
      user,
      dogsCount: dogsCountByUserId[id] ?? 0,
    }
  }
}
