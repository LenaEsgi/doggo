import { inject } from '@adonisjs/core'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'

@inject()
export class DeleteUserUseCase {
  constructor(
    private readonly userReadRepository: UserReadRepository,
    private readonly userWriteRepository: UserWriteRepository
  ) {}

  async execute(id: string): Promise<boolean> {
    const user = await this.userReadRepository.findById(id)

    if (!user) {
      return false
    }

    await this.userWriteRepository.delete(id)
    return true
  }
}
