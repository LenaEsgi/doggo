import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { UpdateRobotDogDto } from '#app/modules/dogs/application/DTO/update-robot-dog.dto'
import { RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { findOrThrow } from '#app/modules/share/utils/find-or-throw'

@inject()
export class UpdateRobotDogUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(dto: UpdateRobotDogDto): Promise<void> {
    logger.info({ robotDogId: dto.id, newName: dto.name }, 'UpdateRobotDogUseCase started')

    const id = RobotDogId.fromString(dto.id)
    const robotDog = await findOrThrow(
      () => this.robotDogRepository.findById(id),
      RobotDogNotFoundError,
      dto.id
    )

    robotDog.updateName(dto.name)
    await this.robotDogRepository.save(robotDog)

    logger.info(
      { robotDogId: dto.id, updatedName: dto.name },
      'UpdateRobotDogUseCase completed successfully'
    )
  }
}
