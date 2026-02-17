import { User } from '#users/domain/user.entity'

export abstract class ShowUserService {
  abstract show(id: string): Promise<User | null>
}
