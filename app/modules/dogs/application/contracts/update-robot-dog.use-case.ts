import { type UpdateRobotDogDto } from '../DTO/update-robot-dog.dto.js'

export abstract class UpdateRobotDogUseCase {
  abstract execute(dto: UpdateRobotDogDto): Promise<void>
}
