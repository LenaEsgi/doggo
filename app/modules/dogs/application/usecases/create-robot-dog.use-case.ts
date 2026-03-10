import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { RobotDog } from '../../domain/robot-dog.entity.js'
import { CreateRobotDogDto } from '../DTO/create-robot-dog.dto.js'
import { inject } from '@adonisjs/core'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-existe.error'
import logger from '@adonisjs/core/services/logger'

@inject()
export class CreateRobotDogUseCase {
  constructor(private robotDogRepository: RobotDogRepository) {}

  async execute(dto: CreateRobotDogDto) {
    logger.info('CreateRobotDogUseCase started', {
      serialNumber: dto.serialNumber,
      name: dto.name,
    })

    try {
      const existing = await this.robotDogRepository.findBySerialNumber(dto.serialNumber)

      if (existing) {
        logger.warn('Serial number already exists', {
          serialNumber: dto.serialNumber,
        })

        throw new RobotDogSerialNumberAlreadyExistsError(dto.serialNumber)
      }

      const robotDog = RobotDog.create(dto.serialNumber, dto.name, dto.batteryLevel)

      await this.robotDogRepository.save(robotDog)

      logger.info('Robot dog successfully created', {
        id: robotDog.id.value,
        serialNumber: robotDog.serialNumber,
      })
    } catch (error) {
      if (!(error instanceof RobotDogSerialNumberAlreadyExistsError)) {
        logger.error('Unexpected error during robot dog creation', {
          serialNumber: dto.serialNumber,
          error,
        })
      }

      throw error
    }
  }
}
