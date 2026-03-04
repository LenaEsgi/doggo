import { type User } from '#users/domain/user.entity'

export abstract class IndexUserService {
  abstract index(): Promise<User[]>
}
