import { type User } from '#users/domain/user.entity'

export abstract class UserReadRepository {
  abstract findById(id: string): Promise<User | null>
  abstract findAll(): Promise<User[]>
}
