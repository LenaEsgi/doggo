import { inject } from '@adonisjs/core'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class DeleteUserUseCase {
  constructor(
    private readonly userReadRepository: UserReadRepository,
    private readonly userWriteRepository: UserWriteRepository
  ) {}

  async execute(id: string): Promise<void> {
    const user = await this.userReadRepository.findById(id)

    if (!user) {
      throw new InvalidUserNotFoundError(id)
    }

    await this.userWriteRepository.delete(id)
  }
}
