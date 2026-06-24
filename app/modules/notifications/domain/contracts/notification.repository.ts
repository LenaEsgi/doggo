import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import type { PaginationDto } from '#app/modules/share/DTO/pagination.dto'

export type Severity = 'critical' | 'warning' | 'info' | 'success'

export interface NotificationRecord {
  id: string
  userId: string
  type: string
  severity: Severity
  payload: Record<string, unknown> | null
  robotDogId: string | null
  isRead: boolean
  createdAt: string
}

export interface CreateNotificationData {
  userId: string
  type: string
  severity: Severity
  payload: Record<string, unknown> | null
  robotDogId: string | null
}

export abstract class NotificationRepository {
  abstract create(data: CreateNotificationData): Promise<NotificationRecord>
  abstract findByUser(userId: string, params: PaginationDto): Promise<PaginatedResult<NotificationRecord>>
  abstract markAllReadByUser(userId: string): Promise<void>
}
