import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { RobotDogId } from '../../domain/value-objects/robot-dog-id.js'
import { ShowRobotDogDto } from '../DTO/show-robot-dog.dto.js'
import { RobotDogNotFoundError } from '../../domain/exceptions/robot-dog-not-found.error.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDog } from '#dogs/domain/robot-dog.entity'

@inject()
export class ShowRobotDogUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(dto: ShowRobotDogDto): Promise<RobotDog> {
    logger.info({ robotDogId: dto.id }, 'ShowRobotDogUseCase started')

    const id = RobotDogId.fromString(dto.id)

    const robotDog = await this.robotDogRepository.findById(id)

    if (!robotDog) {
      logger.warn({ robotDogId: dto.id }, 'RobotDog not found in ShowRobotDogUseCase')
      throw new RobotDogNotFoundError(dto.id)
    }

    logger.info({ robotDogId: dto.id }, 'ShowRobotDogUseCase completed successfully')

    return robotDog
  }
}
