import { DateTime } from 'luxon'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import {
  NotificationRepository,
  type NotificationRecord,
  type CreateNotificationData,
  type FindNotificationsParams,
  type Severity,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import NotificationModel from '#app/modules/notifications/infrastructure/database/models/notification.model'

export class NotificationRepositoryImplementation extends NotificationRepository {
  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    const row = await NotificationModel.create({
      userId: data.userId,
      type: data.type,
      message: data.message,
      severity: data.severity,
      payload: data.payload,
      robotDogId: data.robotDogId,
      isRead: false,
    })
    return this.toRecord(row)
  }

  async createMany(data: CreateNotificationData[]): Promise<NotificationRecord[]> {
    if (data.length === 0) return []
    const rows = await NotificationModel.createMany(
      data.map((d) => ({
        id: crypto.randomUUID(),
        userId: d.userId,
        type: d.type,
        message: d.message,
        severity: d.severity,
        payload: d.payload,
        robotDogId: d.robotDogId,
        isRead: false,
      }))
    )
    return rows.map((row) => this.toRecord(row))
  }

  async findByUser(
    userId: string,
    params: FindNotificationsParams
  ): Promise<PaginatedResult<NotificationRecord>> {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(params.limit ?? 20, 100)

    const query = NotificationModel.query().where('user_id', userId).orderBy('created_at', 'desc')

    if (params.tab === 'unread') {
      query.where('is_read', false)
    }

    if (params.search) {
      query.where('type', 'like', `%${params.search}%`)
    }

    const paginator = await query.paginate(page, limit)

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
      .update({ is_read: true })
  }

  async countBySeverityToday(severities: Severity[]): Promise<number> {
    const startOfDay = DateTime.now().startOf('day').toSQL()!
    const endOfDay = DateTime.now().endOf('day').toSQL()!

    const rows = await NotificationModel.query()
      .whereIn('severity', severities)
      .whereBetween('created_at', [startOfDay, endOfDay])
      .count('* as total')

    return Number(rows[0].$extras.total)
  }

  private toRecord(row: NotificationModel): NotificationRecord {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      message: row.message,
      severity: row.severity,
      payload: row.payload,
      robotDogId: row.robotDogId,
      isRead: row.isRead,
      createdAt: row.createdAt.toISO()!,
    }
  }
}
