import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type UpdateUserDto } from '#users/application/dto/update.user.dto'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { UserRole } from '#users/domain/enums/user.role'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { User } from '#users/domain/user.entity'

@inject()
export class UpdateUserUseCase {
  constructor(
    private readonly userReadRepository: UserReadRepository,
    private readonly userWriteRepository: UserWriteRepository
  ) {}

  async execute(id: string, payload: UpdateUserDto): Promise<User> {
    logger.info({ userId: id }, 'UpdateUserUseCase started')
    const current = await this.userReadRepository.findById(id)

    if (!current) {
      logger.warn({ userId: id }, 'User not found in UpdateUserUseCase')
      throw new InvalidUserNotFoundError(id)
    }

    const role = payload.role
      ? payload.role === 'admin'
        ? UserRole.ADMIN
        : UserRole.USER
      : current.role

    const updated = User.rehydrate(
      current.id,
      payload.firebaseUid ?? current.firebaseUid,
      payload.email ?? current.email,
      payload.firstname ?? current.firstname,
      payload.lastname ?? current.lastname,
      role
    )

    const user = await this.userWriteRepository.update(updated)
    logger.info({ userId: id }, 'UpdateUserUseCase completed successfully')
    return user
  }
}
