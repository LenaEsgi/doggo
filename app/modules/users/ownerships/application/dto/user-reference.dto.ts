import type { User } from '#users/domain/user.entity'

export type UserReferenceDto = {
  user: User
  dogsCount: number
}
