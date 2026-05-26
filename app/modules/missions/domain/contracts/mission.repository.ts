import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import type Mission from '../entities/mission.entity.js'
import { type MissionId } from '#app/modules/missions/domain/value-objects/mission-id'

export abstract class MissionRepository {
  abstract findById(id: MissionId): Promise<Mission | null>
  abstract index(options?: PaginationDto, userId?: string): Promise<PaginatedResult<Mission>>
  abstract save(mission: Mission): Promise<void>
  abstract delete(missionId: MissionId): Promise<void>
  abstract listByRobotDog(dogId: string, options?: PaginationDto): Promise<PaginatedResult<Mission>>
  abstract assignToDog(dogId: string, missionId: string): Promise<void>
  abstract removeFromDog(dogId: string, missionId: string): Promise<void>
}
