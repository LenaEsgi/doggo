import { type User } from '#users/domain/user.entity'

export abstract class UserWriteRepository {
  abstract create(user: User): Promise<User>
  abstract update(user: User): Promise<User>
  abstract delete(id: string): Promise<void>
}
