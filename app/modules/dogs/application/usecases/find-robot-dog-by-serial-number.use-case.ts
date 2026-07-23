import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { type RobotDog } from '#dogs/domain/robot-dog.entity'

@inject()
export class FindRobotDogBySerialNumberUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(serialNumber: string): Promise<RobotDog> {
    const robotDog = await this.robotDogRepository.findBySerialNumber(serialNumber)

    if (!robotDog) {
      logger.warn({ serialNumber }, 'RobotDog not found in FindRobotDogBySerialNumberUseCase')
      throw new RobotDogNotFoundError(serialNumber)
    }

    return robotDog
  }
}
