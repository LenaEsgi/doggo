import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { UpdateRobotDogDto } from '#app/modules/dogs/application/DTO/update-robot-dog.dto'
import { RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
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
