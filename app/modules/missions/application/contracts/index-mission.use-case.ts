
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

export abstract class IndexMissionUseCase {
  abstract execute(
    params: PaginationDto
  ): Promise<PaginatedResult<Mission>>
}
