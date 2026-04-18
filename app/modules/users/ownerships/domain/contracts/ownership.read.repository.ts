import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'

export abstract class OwnershipReadRepository {
  abstract countActiveDogsByUserIds(userIds: string[]): Promise<Record<string, number>>
  abstract countActiveUsersByRobotDogIds(robotDogIds: string[]): Promise<Record<string, number>>
  abstract findActiveDogIdsByUserId(userId: string): Promise<string[]>
  abstract findActiveUserIdsByRobotDogId(
    robotDogId: string,
    options?: PaginationDto
  ): Promise<PaginatedResult<string>>
  abstract isOwner(userId: string, robotDogId: string): Promise<boolean>
}
