import { type User } from '#users/domain/user.entity'

export abstract class UserGateway {
  abstract findBy(id: string): Promise<User | null>
}
