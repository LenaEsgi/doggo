import { type DestroyRobotDogDto } from '../DTO/destroy-robot-dog.dto.js'

export abstract class DestroyRobotDogUseCase {
  abstract execute(id: DestroyRobotDogDto): Promise<void>
}
