import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

export default class UserPolicy extends BasePolicy {
  before(user: User | null): AuthorizerResponse | void {
    if (user?.role === UserRole.ADMIN) return true
  }

  index(_user: User): AuthorizerResponse {
    return false
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

  listDogOwners(_user: User): AuthorizerResponse {
    return true
  }

  listDogs(user: User, targetUserId: string): AuthorizerResponse {
    return user.id === targetUserId
  }
}
