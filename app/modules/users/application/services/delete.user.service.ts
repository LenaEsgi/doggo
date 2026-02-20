import { inject } from '@adonisjs/core'
import { DeleteUserService } from '#users/application/contracts/delete.user.service'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'

@inject()
export class DeleteUser implements DeleteUserService {
  constructor(
    private userReadRepository: UserReadRepository,
    private userWriteRepository: UserWriteRepository
  ) {}

  async delete(id: string): Promise<boolean> {
    const user = await this.userReadRepository.findById(id)

    if (!user) {
      return false
    }

    await this.userWriteRepository.delete(id)
    return true
  }
}
