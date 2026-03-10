import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

export class UserSerializer {
  static toJson(user: User) {
    return {
      id: user.id,
      //firebaseUid: user.firebaseUid,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role === UserRole.ADMIN ? 'admin' : 'user',
    }
  }

  static collection(users: User[]) {
    return users.map((user) => this.toJson(user))
  }
}
