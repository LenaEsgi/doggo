import { type CreateRobotDogDto } from '../DTO/create-robot-dog.dto.js'

export abstract class CreateRobotDogUseCase {
  abstract execute(dto: CreateRobotDogDto): Promise<void>
}
