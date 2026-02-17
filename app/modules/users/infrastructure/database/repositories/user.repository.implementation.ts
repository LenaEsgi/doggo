import { User } from '../../../domain/user.entity.js'
import UserModel from '../models/user.js'
import { UserRole } from '../../../domain/enums/user.role.js'
import { UserRepository } from '../../../domain/contracts/user.repository.js'

export class UserRepositoryImplementation implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const user: UserModel = await UserModel.findOrFail(id)

    return User.rehydrate(
      user.id,
      user.email,
      user.firstname,
      user.lastname,
      user.role as UserRole)
  }
  async findAll(): Promise<User[]> {
    const users: UserModel[] = await UserModel.all()

    return users.map((user) =>
      User.rehydrate(
        user.id,
        user.email,
        user.firstname,
        user.lastname,
        user.role as UserRole,
      )
    )
  }
  async save(user: User): Promise<void> {
    await UserModel.updateOrCreate(
      { id: user.id },
      {
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
      }
    )
  }

  async delete(id: string): Promise<void> {
    const user = await UserModel.findOrFail(id)
    await user.delete()
  }
}
