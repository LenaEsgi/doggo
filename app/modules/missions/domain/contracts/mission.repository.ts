import missions from '../entities/mission.entity.js'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'

export abstract class MissionRepository {
  abstract findById(): Promise<missions | null>
  abstract index(options?: PaginationDto): Promise<PaginatedResult<missions>>
  abstract save(dog: missions): Promise<void>
  abstract delete(): Promise<void>
}
