import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { RobotDogId } from '../../domain/value-objects/robot-dog-id.js'
import { ShowRobotDogDto } from '../DTO/show-robot-dog.dto.js'
import { RobotDogNotFoundError } from '../../domain/exceptions/robot-dog-not-found.error.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { RobotDogWithOwnersSummaryDto } from '#dogs/application/DTO/robot-dog-with-owners-summary.dto'

@inject()
export class ShowRobotDogUseCase {
  constructor(
    private readonly robotDogRepository: RobotDogRepository,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(dto: ShowRobotDogDto): Promise<RobotDogWithOwnersSummaryDto> {
    logger.info({ robotDogId: dto.id }, 'ShowRobotDogUseCase started')

    const id = RobotDogId.fromString(dto.id)

    const robotDog = await this.robotDogRepository.findById(id)

    if (!robotDog) {
      logger.warn({ robotDogId: dto.id }, 'RobotDog not found in ShowRobotDogUseCase')
      throw new RobotDogNotFoundError(dto.id)
    }

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
