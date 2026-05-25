import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

export default class UserPolicy extends BasePolicy {
  before(user: User | null): AuthorizerResponse | void {
    if (user?.role === UserRole.ADMIN) return true
  }

  listDogs(user: User, targetUserId: string): AuthorizerResponse {
    return user.id === targetUserId
  }
}
