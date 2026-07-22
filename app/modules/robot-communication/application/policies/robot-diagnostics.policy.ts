import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

export default class RobotDiagnosticsPolicy extends BasePolicy {
  index(user: User): AuthorizerResponse {
    return user.role === UserRole.ADMIN
  }
}
