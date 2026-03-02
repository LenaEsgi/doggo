
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { MissionOutputDto } from '../dto/mission.output.dto.js'

export abstract class IndexMissionUseCase {
  abstract execute(
    params: PaginationDto
  ): Promise<PaginatedResult<MissionOutputDto>>
}