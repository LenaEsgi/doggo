import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { RobotDog } from '../../domain/robot-dog.entity.js'
import { CreateRobotDogDto } from '../DTO/create-robot-dog.dto.js'
import { inject } from '@adonisjs/core'
import { CreateRobotDogUseCase } from '../contracts/create-robot-dog.use-case.js'
import {
  RobotDogSerialNumberAlreadyExistsError
} from '#dogs/domain/exceptions/robot-dog-serial-number-already-existe.error'

@inject()
export class CreateRobotDogUseCaseImplementation implements CreateRobotDogUseCase {
  constructor(private robotDogRepository: RobotDogRepository) {}

  async execute(dto: CreateRobotDogDto) {

    const existing = await this.robotDogRepository
      .findBySerialNumber(dto.serialNumber)

    if (existing) {
      throw new RobotDogSerialNumberAlreadyExistsError(dto.serialNumber)
    }

    const robotDog = RobotDog.create(
      dto.serialNumber,
      dto.name,
      dto.batteryLevel
    )
    await this.robotDogRepository.save(robotDog)
  }
}
