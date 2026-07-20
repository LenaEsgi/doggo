import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export type Severity = 'critical' | 'warning' | 'info' | 'success'

export type NotificationTab = 'all' | 'unread'

export interface NotificationRecord {
  id: string
  userId: string
  type: string
  message: string
  severity: Severity
  payload: Record<string, unknown> | null
  robotDogId: string | null
  isRead: boolean
  createdAt: string
}

export interface CreateNotificationData {
  userId: string
  type: string
  message: string
  severity: Severity
  payload: Record<string, unknown> | null
  robotDogId: string | null
}

export interface FindNotificationsParams {
  page?: number
  limit?: number
  tab?: NotificationTab
  search?: string
}

export abstract class NotificationRepository {
  abstract create(data: CreateNotificationData): Promise<NotificationRecord>
  abstract createMany(data: CreateNotificationData[]): Promise<NotificationRecord[]>
  abstract findByUser(
    userId: string,
    params: FindNotificationsParams
  ): Promise<PaginatedResult<NotificationRecord>>
  abstract markAllReadByUser(userId: string): Promise<void>
  abstract countBySeverityToday(severities: Severity[]): Promise<number>
}
