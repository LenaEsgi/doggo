import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'

@inject()
export default class UserPolicy extends BasePolicy {
  constructor(private readonly ownershipRepository: OwnershipReadRepository) {
    super()
  }

  before(user: User | null): AuthorizerResponse | void {
    if (user?.role === UserRole.ADMIN) return true
  }

  index(user: User): AuthorizerResponse {
    return user.role === UserRole.ADMIN
  }

  show(user: User, targetUserId: string): AuthorizerResponse {
    return user.id === targetUserId
  }

  update(user: User, targetUserId: string): AuthorizerResponse {
    return user.id === targetUserId
  }

  updateRole(_user: User): AuthorizerResponse {
    return false
  }

  adopt(user: User, targetUserId: string): AuthorizerResponse {
    return user.id === targetUserId
  }

  abandon(user: User, targetUserId: string): AuthorizerResponse {
    return user.id === targetUserId
  }

  async listDogOwners(user: User, dogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, dogId)
  }

  listDogs(user: User, targetUserId: string): AuthorizerResponse {
    return user.id === targetUserId
  }
}
