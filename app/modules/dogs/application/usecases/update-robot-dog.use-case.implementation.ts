import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { UpdateRobotDogDto } from '../DTO/update-robot-dog.dto.js'
import { RobotDogId } from '../../domain/value-objects/robot-dog-id.js'
import { RobotDogNotFoundError } from '../../domain/exceptions/robot-dog-not-found.error.js'
import { inject } from '@adonisjs/core'
import { UpdateRobotDogUseCase } from '../contracts/update-robot-dog.use-case.js'

@inject()
export class UpdateRobotDogUseCaseImplementation implements UpdateRobotDogUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(dto: UpdateRobotDogDto): Promise<void> {
    console.log(dto)
    const id = RobotDogId.fromString(dto.id)
    console.log(id)
    const robotDog = await this.robotDogRepository.findById(id)

    if (!robotDog) {
      throw new RobotDogNotFoundError(dto.id)
    }

    robotDog.updateName(dto.name)

    await this.robotDogRepository.save(robotDog)
  }
}
