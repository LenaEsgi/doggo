export abstract class OwnershipWriteRepository {
  abstract adopt(userId: string, robotDogId: string, startDate: Date): Promise<void>
  abstract abandon(userId: string, robotDogId: string, endDate: Date): Promise<boolean>
}
