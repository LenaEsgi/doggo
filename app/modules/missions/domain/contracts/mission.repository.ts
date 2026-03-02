import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import Mission from '../entities/mission.entity.js'

export abstract class MissionRepository {
  abstract findById(): Promise<Mission | null>
  abstract index(options?: PaginationDto): Promise<PaginatedResult<Mission>>
  abstract save(mission: Mission): Promise<void>
  abstract delete(): Promise<void>
}
