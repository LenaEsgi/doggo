import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import type { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export class FakeOwnershipRepository
  extends OwnershipReadRepository
  implements OwnershipWriteRepository
{
  constructor(
    private readonly userToDogs: Record<string, string[]> = {},
    private readonly dogToUsers: Record<string, string[]> = {}
  ) {
    super()
  }

  async countActiveDogsByUserIds(userIds: string[]): Promise<Record<string, number>> {
    return userIds.reduce(
      (acc, userId) => {
        acc[userId] = this.userToDogs[userId]?.length ?? 0
        return acc
      },
      {} as Record<string, number>
    )
  }

  async countActiveUsersByRobotDogIds(robotDogIds: string[]): Promise<Record<string, number>> {
    return robotDogIds.reduce(
      (acc, dogId) => {
        acc[dogId] = this.dogToUsers[dogId]?.length ?? 0
        return acc
      },
      {} as Record<string, number>
    )
  }

  async findActiveDogIdsByUserId(userId: string): Promise<string[]> {
    return this.userToDogs[userId] ?? []
  }

  async findActiveUserIdsByRobotDogId(
    robotDogId: string,
    options?: PaginationDto
  ): Promise<PaginatedResult<string>> {
    const allUserIds = this.dogToUsers[robotDogId] ?? []
    const page = options?.page ?? 1
    const perPage = options?.limit ?? 10
    const start = (page - 1) * perPage
    const data = allUserIds.slice(start, start + perPage)
    const total = allUserIds.length
    const lastPage = Math.max(1, Math.ceil(total / perPage))

    return {
      data,
      meta: {
        total,
        perPage,
        currentPage: page,
        firstPage: 1,
        lastPage,
      },
    }
  }

  async isOwner(userId: string, robotDogId: string): Promise<boolean> {
    return (this.userToDogs[userId] ?? []).includes(robotDogId)
  }

  async adopt(userId: string, robotDogId: string): Promise<void> {
    const dogs = new Set(this.userToDogs[userId] ?? [])
    dogs.add(robotDogId)
    this.userToDogs[userId] = [...dogs]

    const users = new Set(this.dogToUsers[robotDogId] ?? [])
    users.add(userId)
    this.dogToUsers[robotDogId] = [...users]
  }

  async abandon(userId: string, robotDogId: string): Promise<boolean> {
    const userDogs = this.userToDogs[userId] ?? []

    if (!userDogs.includes(robotDogId)) {
      return false
    }

    this.userToDogs[userId] = userDogs.filter((dogId) => dogId !== robotDogId)
    this.dogToUsers[robotDogId] = (this.dogToUsers[robotDogId] ?? []).filter(
      (ownerId) => ownerId !== userId
    )

    return true
  }
}
