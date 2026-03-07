import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'

export abstract class IndexMissionUseCase {
  abstract execute(params: PaginationDto): Promise<PaginatedResult<Mission>>
}
