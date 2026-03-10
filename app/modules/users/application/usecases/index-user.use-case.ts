import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { type User } from '#users/domain/user.entity'

@inject()
export class IndexUserUseCase {
  constructor(private readonly userRepository: UserReadRepository) {}

  async execute(): Promise<User[]> {
    logger.info({}, 'IndexUserUseCase started')
    const users = await this.userRepository.findAll()
    logger.info({ count: users.length }, 'IndexUserUseCase completed successfully')
    return users
  }
}
