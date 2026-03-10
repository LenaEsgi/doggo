import { inject } from '@adonisjs/core'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { type User } from '#users/domain/user.entity'

@inject()
export class ShowUserUseCase {
  constructor(private readonly userRepository: UserReadRepository) {}

  async execute(id: string): Promise<User | null> {
    return this.userRepository.findById(id)
  }
}
