import { inject } from '@adonisjs/core'
import { IndexUserService } from '#users/application/contracts/index.user.service'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { User } from '#users/domain/user.entity'

@inject()
export class IndexUser implements IndexUserService {
  constructor(private userRepository: UserReadRepository) {}

  async index(): Promise<User[]> {
    return this.userRepository.findAll()
  }
}
