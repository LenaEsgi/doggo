import { RobotDogOutput } from '../DTO/robot-dog.output.dto.js'

export abstract class IndexRobotDogsUseCase {
  abstract execute(): Promise<RobotDogOutput[]>
}
