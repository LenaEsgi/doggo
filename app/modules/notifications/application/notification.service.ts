import { inject } from '@adonisjs/core'
import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'
import type { NotificationRecord, Severity } from '#app/modules/notifications/domain/contracts/notification.repository'

export type NotificationType =
  | 'dog.assigned'
  | 'dog.revoked'
  | 'dog.member.assigned'
  | 'dog.member.revoked'
  | 'mission.started'
  | 'mission.completed'

@inject()
export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  async create(
    userId: string,
    type: NotificationType,
    severity: Severity,
    payload?: Record<string, unknown>,
    robotDogId?: string
  ): Promise<void> {
    const notification = await this.repo.create({
      userId,
      type,
      severity,
      payload: payload ?? null,
      robotDogId: robotDogId ?? null,
    })
    this.broadcast(notification)
  }

  async createBulk(
    userIds: string[],
    type: NotificationType,
    severity: Severity,
    payload?: Record<string, unknown>,
    robotDogId?: string
  ): Promise<void> {
    if (userIds.length === 0) return

    const notifications = await this.repo.createMany(
      userIds.map((userId) => ({
        userId,
        type,
        severity,
        payload: payload ?? null,
        robotDogId: robotDogId ?? null,
      }))
    )

    for (const notification of notifications) {
      this.broadcast(notification)
    }
  }

  private broadcast(notification: NotificationRecord): void {
    try {
      transmit.broadcast(`users/${notification.userId}`, {
        type: 'notification',
        notification: {
          id: notification.id,
          type: notification.type,
          severity: notification.severity,
          payload: notification.payload,
          robotDogId: notification.robotDogId,
          isRead: false as const,
          createdAt: notification.createdAt,
        },
      } as unknown as Parameters<typeof transmit.broadcast>[1])
    } catch (error) {
      logger.error({ err: error, userId: notification.userId }, 'NotificationService: SSE broadcast failed')
    }
  }
}
