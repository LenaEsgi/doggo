import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import type { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import OwnershipModel from '#app/modules/users/ownerships/infrastructure/database/models/ownership'

export class OwnershipRepositoryImplementation
  extends OwnershipReadRepository
  implements OwnershipWriteRepository
{
  async countActiveDogsByUserIds(userIds: string[]): Promise<Record<string, number>> {
    if (userIds.length === 0) {
      return {}
    }

    const rows = await db
      .from('ownerships')
      .whereIn('user_id', userIds)
      .whereNull('end_date')
      .groupBy('user_id')
      .select('user_id')
      .count('* as total')

    return rows.reduce(
      (acc, row) => {
        acc[String(row.user_id)] = Number(row.total)
        return acc
      },
      {} as Record<string, number>
    )
  }

  async countActiveUsersByRobotDogIds(robotDogIds: string[]): Promise<Record<string, number>> {
    if (robotDogIds.length === 0) {
      return {}
    }

    const rows = await db
      .from('ownerships')
      .whereIn('robot_dog_id', robotDogIds)
      .whereNull('end_date')
      .groupBy('robot_dog_id')
      .select('robot_dog_id')
      .count('* as total')

    return rows.reduce(
      (acc, row) => {
        acc[String(row.robot_dog_id)] = Number(row.total)
        return acc
      },
      {} as Record<string, number>
    )
  }

  async findActiveDogIdsByUserId(userId: string): Promise<string[]> {
    const rows = await db
      .from('ownerships')
      .where('user_id', userId)
      .whereNull('end_date')
      .select('robot_dog_id')
      .orderBy('start_date', 'desc')

    return rows.map((row) => String(row.robot_dog_id))
  }

  async findActiveUserIdsByRobotDogId(robotDogId: string): Promise<string[]> {
    const rows = await db
      .from('ownerships')
      .where('robot_dog_id', robotDogId)
      .whereNull('end_date')
      .select('user_id')
      .orderBy('start_date', 'desc')

    return rows.map((row) => String(row.user_id))
  }

  async adopt(userId: string, robotDogId: string, startDate: Date): Promise<void> {
    await OwnershipModel.updateOrCreate(
      { userId, robotDogId },
      {
        userId,
        robotDogId,
        startDate: DateTime.fromJSDate(startDate),
        endDate: null,
      }
    )
  }

  async abandon(userId: string, robotDogId: string, endDate: Date): Promise<boolean> {
    const ownership = await OwnershipModel.query()
      .where('user_id', userId)
      .where('robot_dog_id', robotDogId)
      .whereNull('end_date')
      .first()

    if (!ownership) {
      return false
    }

    ownership.endDate = DateTime.fromJSDate(endDate)
    await ownership.save()

    return true
  }
}
