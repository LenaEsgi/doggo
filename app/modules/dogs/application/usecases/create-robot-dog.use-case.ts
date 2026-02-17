import { RobotDogRepository } from '../../domain/contracts/robot_dog.repository.js'
import { RobotDog } from '../../domain/robot_dog.entity.js'
import { CreateRobotDogDto } from '../DTO/create-robot-dog.dto.js'

export class CreateRobotDogUseCase {
  constructor(private robotDogRepository: RobotDogRepository) {}

  async execute(dto: CreateRobotDogDto) {

    const robotDog = RobotDog.create(
      dto.serialNumber,
      dto.name,
      dto.batteryLevel
    )

    await this.robotDogRepository.save(robotDog)
  }
}
