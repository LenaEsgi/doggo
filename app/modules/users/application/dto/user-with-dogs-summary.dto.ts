import type { User } from '#users/domain/user.entity'

export type UserWithDogsSummaryDto = {
  user: User
  dogsCount: number
}
