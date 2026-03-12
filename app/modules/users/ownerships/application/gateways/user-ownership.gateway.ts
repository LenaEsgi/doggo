import type { User } from '#users/domain/user.entity'

export abstract class UserOwnershipGateway {
  abstract existsById(userId: string): Promise<boolean>
  abstract findByIds(ids: string[]): Promise<User[]>
}
