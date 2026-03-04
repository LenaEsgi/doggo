import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { type RobotDogOutput } from '#dogs/application/DTO/robot-dog.output.dto'

export abstract class IndexRobotDogsUseCase {
  abstract execute(params: PaginationDto): Promise<PaginatedResult<RobotDogOutput>>
}
