import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { type User } from '#users/domain/user.entity'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class ShowUserUseCase {
  constructor(private readonly userRepository: UserReadRepository) {}

  async execute(id: string): Promise<User> {
    logger.info({ userId: id }, 'ShowUserUseCase started')
    const user = await this.userRepository.findById(id)

    if (!user) {
      logger.warn({ userId: id }, 'User not found in ShowUserUseCase')
      throw new InvalidUserNotFoundError(id)
    }

    logger.info({ userId: id }, 'ShowUserUseCase completed successfully')
    return user
  }
}
