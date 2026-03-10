import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { UpdateRobotDogDto } from '../DTO/update-robot-dog.dto.js'
import { RobotDogId } from '../../domain/value-objects/robot-dog-id.js'
import { RobotDogNotFoundError } from '../../domain/exceptions/robot-dog-not-found.error.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

@inject()
export class UpdateRobotDogUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(dto: UpdateRobotDogDto): Promise<void> {
    logger.info({ robotDogId: dto.id, newName: dto.name }, 'UpdateRobotDogUseCase started')

    const id = RobotDogId.fromString(dto.id)
    const robotDog = await this.robotDogRepository.findById(id)

    if (!robotDog) {
      logger.warn({ robotDogId: dto.id }, 'RobotDog not found in UpdateRobotDogUseCase')
      throw new RobotDogNotFoundError(dto.id)
    }

    robotDog.updateName(dto.name)
    await this.robotDogRepository.save(robotDog)

    logger.info(
      { robotDogId: dto.id, updatedName: dto.name },
      'UpdateRobotDogUseCase completed successfully'
    )
  }
}
