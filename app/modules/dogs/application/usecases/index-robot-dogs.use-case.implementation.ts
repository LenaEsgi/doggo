import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { IndexRobotDogsUseCase } from '../contracts/index-robot-dogs.use-case.js'
import { RobotDogOutput } from '../DTO/robot-dog.output.dto.js'
import { inject } from '@adonisjs/core'

@inject()
export class IndexRobotDogsUseCaseImplementation implements IndexRobotDogsUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(): Promise<RobotDogOutput[]> {
    const dogs = await this.robotDogRepository.findAll()

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
