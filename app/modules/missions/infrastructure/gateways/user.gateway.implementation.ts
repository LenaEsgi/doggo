import { inject } from '@adonisjs/core'
import { UserGateway } from '#app/modules/missions/application/contracts/user.gateway'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { User } from '#users/domain/user.entity'

@inject()
export class UserGatewayImplementation implements UserGateway {
  constructor(private repo: UserReadRepository) {}

  findBy(id: string): Promise<User | null> {
    return this.repo.findById(id)
  }
}
