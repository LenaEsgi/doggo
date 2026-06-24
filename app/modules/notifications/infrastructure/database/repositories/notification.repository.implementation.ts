import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import type { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import {
  NotificationRepository,
  type NotificationRecord,
  type CreateNotificationData,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import NotificationModel from '#app/modules/notifications/infrastructure/database/models/notification.model'

export class NotificationRepositoryImplementation extends NotificationRepository {
  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    const row = await NotificationModel.create({
      userId: data.userId,
      type: data.type,
      severity: data.severity,
      payload: data.payload,
      robotDogId: data.robotDogId,
      isRead: false,
    })
    return this.toRecord(row)
  }

  async findByUser(userId: string, params: PaginationDto): Promise<PaginatedResult<NotificationRecord>> {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(params.limit ?? 20, 100)

    const paginator = await NotificationModel.query()
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .paginate(page, limit)

    return {
      data: paginator.all().map((row) => this.toRecord(row)),
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        firstPage: paginator.firstPage,
        lastPage: paginator.lastPage,
      },
    }
  }

  async markAllReadByUser(userId: string): Promise<void> {
    await NotificationModel.query()
      .where('user_id', userId)
      .where('is_read', false)
      .update({ isRead: true })
  }

  private toRecord(row: NotificationModel): NotificationRecord {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      severity: row.severity,
      payload: row.payload,
      robotDogId: row.robotDogId,
      isRead: row.isRead,
      createdAt: row.createdAt.toISO()!,
    }
  }
}
