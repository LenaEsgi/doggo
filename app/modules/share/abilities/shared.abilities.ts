import { Bouncer } from '@adonisjs/bouncer'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

export const isAdmin = Bouncer.ability((user: User) => {
  return user.role === UserRole.ADMIN
})
