import { RobotDogRepository } from '../../domain/contracts/robot_dog.repository.js'
import { RobotDogId } from '../../domain/value-objects/robot-dog-id.js'
import { RobotDogOutput } from '../DTO/robot-dog.output.dto.js'
import { ShowRobotDogDto } from '../DTO/show-robot-dog.dto.js'
import { RobotDogNotFoundError } from '../../domain/exceptions/robot-dog-not-found.error.js'

export class ShowRobotDogUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(dto: ShowRobotDogDto): Promise<RobotDogOutput> {
    const id = RobotDogId.fromString(dto.id)

    const robotDog = await this.robotDogRepository.findById(id)

    if (!robotDog) {
      throw new RobotDogNotFoundError(dto.id)
    }

    return {
      id: robotDog.id.value,
      serialNumber: robotDog.serialNumber,
      name: robotDog.name,
      state: robotDog.state,
      batteryLevel: robotDog.batteryLevel,
      lastHeartbeat: robotDog.lastHeartbeat,
    }
  }
}
