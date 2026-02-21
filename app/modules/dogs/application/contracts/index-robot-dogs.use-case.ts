import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { RobotDogOutput } from '#dogs/application/DTO/robot-dog.output.dto'

export abstract class IndexRobotDogsUseCase {
  abstract execute(params: PaginationDto): Promise<PaginatedResult<RobotDogOutput>>
}
