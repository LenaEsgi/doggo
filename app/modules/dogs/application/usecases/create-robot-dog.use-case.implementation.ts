import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { RobotDog } from '../../domain/robot-dog.entity.js'
import { CreateRobotDogDto } from '../DTO/create-robot-dog.dto.js'
import { inject } from '@adonisjs/core'
import { CreateRobotDogUseCase } from '../contracts/create-robot-dog.use-case.js'

@inject()
export class CreateRobotDogUseCaseImplementation implements CreateRobotDogUseCase {
  constructor(private robotDogRepository: RobotDogRepository) {}

  async execute(dto: CreateRobotDogDto) {
    console.log(dto)
    const robotDog = RobotDog.create(
      dto.serialNumber,
      dto.name,
      dto.batteryLevel
    )
  console.log(robotDog)
    await this.robotDogRepository.save(robotDog)
  }
}
