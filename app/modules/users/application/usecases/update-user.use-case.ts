import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { UserWithDogsSummaryDto } from '#users/application/dto/user-with-dogs-summary.dto'
import { type UpdateUserDto } from '#users/application/dto/update.user.dto'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { UserRole } from '#users/domain/enums/user.role'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { User } from '#users/domain/user.entity'
import { findOrThrow } from '#app/modules/share/utils/find-or-throw'

@inject()
export class UpdateUserUseCase {
  constructor(
    private readonly userReadRepository: UserReadRepository,
    private readonly userWriteRepository: UserWriteRepository,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(id: string, payload: UpdateUserDto): Promise<UserWithDogsSummaryDto> {
    logger.info({ userId: id }, 'UpdateUserUseCase started')
    const current = await findOrThrow(
      () => this.userReadRepository.findById(id),
      InvalidUserNotFoundError,
      id
    )

    const role = payload.role
      ? payload.role === 'admin'
        ? UserRole.ADMIN
        : UserRole.USER
      : current.role

    const updated = User.rehydrate(
      current.id,
      current.firebaseUid,
      payload.email ?? current.email,
      payload.firstname ?? current.firstname,
      payload.lastname ?? current.lastname,
      role,
      payload.locale ?? current.locale
    )

    const user = await this.userWriteRepository.update(updated)
    const dogsCountByUserId = await this.ownershipReadRepository.countActiveDogsByUserIds([id])
    logger.info({ userId: id }, 'UpdateUserUseCase completed successfully')
    return {
      user,
      dogsCount: dogsCountByUserId[id] ?? 0,
    }
  }
}
