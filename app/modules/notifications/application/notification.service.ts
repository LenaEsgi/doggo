import { inject } from '@adonisjs/core'
import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'
import type { Severity } from '#app/modules/notifications/domain/contracts/notification.repository'

export type NotificationType = 'dog.assigned' | 'dog.revoked' | 'mission.started' | 'mission.completed'

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

    try {
      transmit.broadcast(`users/${userId}`, {
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
      logger.error({ err: error, userId }, 'NotificationService: SSE broadcast failed')
    }
  }
}
