import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

export default class ActionPolicy extends BasePolicy {
  create(user: User): AuthorizerResponse {
    return user.role === UserRole.ADMIN
  }

  index(_user: User): AuthorizerResponse {
    return true
  }

  show(_user: User): AuthorizerResponse {
    return true
  }

  destroy(user: User): AuthorizerResponse {
    return user.role === UserRole.ADMIN
  }

  update(user: User): AuthorizerResponse {
    return user.role === UserRole.ADMIN
  }
}
