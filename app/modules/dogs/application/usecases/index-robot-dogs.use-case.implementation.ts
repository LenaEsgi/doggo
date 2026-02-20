import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { IndexRobotDogsUseCase } from '../contracts/index-robot-dogs.use-case.js'
import { RobotDogOutput } from '../DTO/robot-dog.output.dto.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

@inject()
export class IndexRobotDogsUseCaseImplementation implements IndexRobotDogsUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(): Promise<RobotDogOutput[]> {
    logger.info({}, 'IndexRobotDogsUseCase started')

    const dogs = await this.robotDogRepository.findAll()

    logger.info({ count: dogs.length }, 'IndexRobotDogsUseCase completed successfully')

    return dogs.map((dog) => ({
      id: dog.id.value,
      serialNumber: dog.serialNumber,
      name: dog.name,
      state: dog.state,
      batteryLevel: dog.batteryLevel,
      lastHeartbeat: dog.lastHeartbeat,
    }))
  }
}
