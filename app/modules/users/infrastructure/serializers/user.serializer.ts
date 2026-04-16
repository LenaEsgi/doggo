import type { UserWithDogsSummaryDto } from '#users/application/dto/user-with-dogs-summary.dto'
import { UserRole } from '#users/domain/enums/user.role'

export class UserSerializer {
  static toJson(summary: UserWithDogsSummaryDto) {
    return {
      id: summary.user.id,
      email: summary.user.email,
      emailVerified: summary.user.emailVerified,
      firstname: summary.user.firstname,
      lastname: summary.user.lastname,
      role: summary.user.role === UserRole.ADMIN ? 'admin' : 'user',
      dogs: {
        count: summary.dogsCount,
        href: `/dogs/users/${summary.user.id}`,
      },
    }
  }

  static collection(users: UserWithDogsSummaryDto[]) {
    return users.map((user) => this.toJson(user))
  }
}
