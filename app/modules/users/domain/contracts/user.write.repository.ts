import { type User } from '#users/domain/user.entity'

export abstract class UserWriteRepository {
  abstract update(user: User): Promise<User>
}
