import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import type UserModel from '#users/infrastructure/database/models/user'

export class UserMapper {
  static toEntity(model: UserModel): User {
    const role =
      model.role === ('admin' as unknown as typeof model.role) ? UserRole.ADMIN : UserRole.USER

    return User.rehydrate(
      model.id,
      model.firebaseUid,
      model.email,
      model.firstname,
      model.lastname,
      role
    )
  }

  static toPersistenceRole(role: UserRole): UserModel['role'] {
    return (role === UserRole.ADMIN ? 'admin' : 'user') as unknown as UserModel['role']
  }
}
