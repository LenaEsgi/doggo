import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { type UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { type User } from '#users/domain/user.entity'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
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

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return []
    }

    const users = await UserModel.query().whereIn('id', ids)
    return users.map((user) => UserMapper.toEntity(user))
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const user = await UserModel.query().where('firebase_uid', firebaseUid).first()

    if (!user) {
      return null
    }

    return UserMapper.toEntity(user)
  }

  async findAll(
    { page = 1, limit = 25, search }: { page: number; limit: number; search?: string } = {
      page: 1,
      limit: 25,
    }
  ): Promise<PaginatedResult<User>> {
    const query = UserModel.query().orderBy('created_at', 'desc')

    if (search) {
      const term = `%${search}%`
      query.where((q) => {
        q.whereILike('firstname', term).orWhereILike('lastname', term).orWhereILike('email', term)
      })
    }

    const paginated = await query.paginate(page, limit)

    return {
      data: paginated.all().map((user) => UserMapper.toEntity(user)),
      meta: {
        total: paginated.total,
        perPage: paginated.perPage,
        currentPage: paginated.currentPage,
        firstPage: paginated.firstPage,
        lastPage: paginated.lastPage,
      },
    }
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
