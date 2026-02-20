import { RobotDogOutput } from '../DTO/robot-dog.output.dto.js'
import { ShowRobotDogDto } from '../DTO/show-robot-dog.dto.js'

export abstract class ShowRobotDogUseCase {
  abstract execute(id: ShowRobotDogDto): Promise<RobotDogOutput>
}
