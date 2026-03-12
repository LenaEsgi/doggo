import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'

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

  async findActiveUserIdsByRobotDogId(robotDogId: string): Promise<string[]> {
    return this.dogToUsers[robotDogId] ?? []
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
