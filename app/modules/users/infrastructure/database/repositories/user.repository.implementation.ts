import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { type UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { type User } from '#users/domain/user.entity'
import UserModel from '#users/infrastructure/database/models/user'
import { UserMapper } from '#users/infrastructure/database/mappers/user.mapper'

export class UserRepositoryImplementation
  extends UserReadRepository
  implements UserWriteRepository
{
  async findById(id: string): Promise<User | null> {
    const user = await UserModel.find(id)

    if (!user) {
      return null
    }

    return UserMapper.toEntity(user)
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const user = await UserModel.query().where('firebase_uid', firebaseUid).first()

    if (!user) {
      return null
    }

    return UserMapper.toEntity(user)
  }

  async findAll(): Promise<User[]> {
    const users = await UserModel.query().orderBy('created_at', 'desc')
    return users.map((user) => UserMapper.toEntity(user))
  }

  async update(user: User): Promise<User> {
    const updated = await UserModel.updateOrCreate(
      { id: user.id },
      {
        firebaseUid: user.firebaseUid,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: UserMapper.toPersistenceRole(user.role),
      }
    )

    return UserMapper.toEntity(updated)
  }

  async delete(id: string): Promise<void> {
    const user = await UserModel.find(id)

    if (!user) {
      return
    }

    await user.delete()
  }
}
