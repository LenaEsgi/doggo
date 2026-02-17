import { inject } from '@adonisjs/core'
import { UpdateUserService } from '#users/application/contracts/update.user.service'
import { UpdateUserDto } from '#users/application/dto/update.user.dto'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { UserRole } from '#users/domain/enums/user.role'
import { User } from '#users/domain/user.entity'

@inject()
export class UpdateUser implements UpdateUserService {
  constructor(
    private userReadRepository: UserReadRepository,
    private userWriteRepository: UserWriteRepository
  ) {}

  async update(id: string, payload: UpdateUserDto): Promise<User | null> {
    const current = await this.userReadRepository.findById(id)

    if (!current) {
      return null
    }

    const role = payload.role
      ? payload.role === 'admin'
        ? UserRole.ADMIN
        : UserRole.USER
      : current.role

    const updated = User.rehydrate(
      current.id,
      payload.email ?? current.email,
      payload.firstname ?? current.firstname,
      payload.lastname ?? current.lastname,
      role
    )

    return this.userWriteRepository.update(updated)
  }
}
