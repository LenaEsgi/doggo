import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { ShowRobotDogDto } from '#app/modules/dogs/application/DTO/show-robot-dog.dto'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { RobotDogWithOwnersSummaryDto } from '#dogs/application/DTO/robot-dog-with-owners-summary.dto'
import { findOrThrow } from '#app/modules/share/utils/find-or-throw'

@inject()
export class ShowRobotDogUseCase {
  constructor(
    private readonly robotDogRepository: RobotDogRepository,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(dto: ShowRobotDogDto): Promise<RobotDogWithOwnersSummaryDto> {
    logger.info({ robotDogId: dto.id }, 'ShowRobotDogUseCase started')

    const id = RobotDogId.fromString(dto.id)

    const robotDog = await findOrThrow(
      () => this.robotDogRepository.findById(id),
      RobotDogNotFoundError,
      dto.id
    )

    logger.info({ robotDogId: dto.id }, 'ShowRobotDogUseCase completed successfully')

    const usersCountByDogId = await this.ownershipReadRepository.countActiveUsersByRobotDogIds([
      dto.id,
    ])

    return {
      robotDog,
      usersCount: usersCountByDogId[dto.id] ?? 0,
    }
  }
}
