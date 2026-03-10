import { inject } from '@adonisjs/core'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { type User } from '#users/domain/user.entity'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class ShowUserUseCase {
  constructor(private readonly userRepository: UserReadRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id)

    if (!user) {
      throw new InvalidUserNotFoundError(id)
    }

    return user
  }
}
