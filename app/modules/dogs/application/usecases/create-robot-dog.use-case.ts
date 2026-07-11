import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { RobotDog } from '#app/modules/dogs/domain/robot-dog.entity'
import { CreateRobotDogDto } from '#app/modules/dogs/application/DTO/create-robot-dog.dto'
import { inject } from '@adonisjs/core'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-exists.error'
import logger from '@adonisjs/core/services/logger'

@inject()
export class CreateRobotDogUseCase {
  constructor(private robotDogRepository: RobotDogRepository) {}

  async execute(dto: CreateRobotDogDto): Promise<RobotDog> {
    logger.info('CreateRobotDogUseCase started', {
      serialNumber: dto.serialNumber,
      name: dto.name,
    })

    const existing = await this.robotDogRepository.findBySerialNumber(dto.serialNumber)

    if (existing) {
      logger.warn('Serial number already exists', { serialNumber: dto.serialNumber })
      throw new RobotDogSerialNumberAlreadyExistsError(dto.serialNumber)
    }

    const robotDog = RobotDog.create(dto.serialNumber, dto.name, dto.batteryLevel)

    await this.robotDogRepository.save(robotDog)

    logger.info('Robot dog successfully created', {
      id: robotDog.id.value,
      serialNumber: robotDog.serialNumber,
    })

    return robotDog
  }
}
