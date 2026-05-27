import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'

@inject()
export default class RobotDogPolicy extends BasePolicy {
  constructor(private readonly ownershipRepository: OwnershipReadRepository) {
    super()
  }

  before(user: User | null): AuthorizerResponse | void {
    if (user?.role === UserRole.ADMIN) return true
  }

  index(_user: User): AuthorizerResponse {
    return false
  }

  async update(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }

  async assign(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }
}
