import { RobotDogRepository } from '../../domain/contracts/robot_dog.repository.js'
import { RobotDogId } from '../../domain/value-objects/robot-dog-id.js'
import { DestroyRobotDogDto } from '../DTO/destroy-robot-dog.dto.js'
import { RobotDogNotFoundError } from '../../domain/exceptions/robot-dog-not-found.error.js'
import { inject } from '@adonisjs/core'

@inject()
export class DeleteRobotDogUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(dto: DestroyRobotDogDto): Promise<void> {
    const id = RobotDogId.fromString(dto.id)

    const robotDog = await this.robotDogRepository.findById(id)

    if (!robotDog) {
      throw new RobotDogNotFoundError(dto.id)
    }

    await this.robotDogRepository.delete(id)
  }
}
