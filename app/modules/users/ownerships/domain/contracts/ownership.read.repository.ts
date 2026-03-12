export abstract class OwnershipReadRepository {
  abstract countActiveDogsByUserIds(userIds: string[]): Promise<Record<string, number>>
  abstract countActiveUsersByRobotDogIds(robotDogIds: string[]): Promise<Record<string, number>>
  abstract findActiveDogIdsByUserId(userId: string): Promise<string[]>
  abstract findActiveUserIdsByRobotDogId(robotDogId: string): Promise<string[]>
}
