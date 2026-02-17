import { inject } from '@adonisjs/core'
import { ShowUserService } from '#users/application/contracts/show.user.service'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { User } from '#users/domain/user.entity'

@inject()
export class ShowUser implements ShowUserService {
  constructor(private userRepository: UserReadRepository) {}

  async show(id: string): Promise<User | null> {
    return this.userRepository.findById(id)
  }
}
