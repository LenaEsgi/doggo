import { inject } from '@adonisjs/core'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { type User } from '#users/domain/user.entity'

@inject()
export class IndexUserUseCase {
  constructor(private readonly userRepository: UserReadRepository) {}

  async execute(): Promise<User[]> {
    return this.userRepository.findAll()
  }
}
