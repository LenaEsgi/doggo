import { inject } from '@adonisjs/core'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import type { User } from '#users/domain/user.entity'

@inject()
export class UserOwnershipGatewayImplementation extends UserOwnershipGateway {
  constructor(private readonly userReadRepository: UserReadRepository) {
    super()
  }

  async existsById(userId: string): Promise<boolean> {
    return (await this.userReadRepository.findById(userId)) !== null
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.userReadRepository.findByIds(ids)
  }
}
