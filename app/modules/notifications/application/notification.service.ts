import { inject } from '@adonisjs/core'
import transmit from '@adonisjs/transmit/services/main'
import logger from '@adonisjs/core/services/logger'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'
import type {
  NotificationRecord,
  Severity,
} from '#app/modules/notifications/domain/contracts/notification.repository'

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
      message: this.buildMessage(type, payload),
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

    const message = this.buildMessage(type, payload)
    const notifications = await this.repo.createMany(
      userIds.map((userId) => ({
        userId,
        type,
        message,
        severity,
        payload: payload ?? null,
        robotDogId: robotDogId ?? null,
      }))
    )

    for (const notification of notifications) {
      this.broadcast(notification)
    }
  }

  private buildMessage(type: NotificationType, payload?: Record<string, unknown>): string {
    const dog = (payload?.robotDogName as string | undefined) ?? 'le robot'
    const member = (payload?.memberName as string | undefined) ?? 'Un utilisateur'
    const mission = (payload?.missionName as string | undefined) ?? 'La mission'

    switch (type) {
      case 'dog.assigned':
        return `Le robot ${dog} vous a été assigné`
      case 'dog.revoked':
        return `Vous avez été retiré du robot ${dog}`
      case 'dog.member.assigned':
        return `${member} a rejoint le robot ${dog}`
      case 'dog.member.revoked':
        return `${member} a quitté le robot ${dog}`
      case 'mission.started':
        return `${mission} a démarré sur le robot ${dog}`
      case 'mission.completed':
        return `${mission} est terminée sur le robot ${dog}`
    }
  }

  private broadcast(notification: NotificationRecord): void {
    try {
      transmit.broadcast(`users/${notification.userId}`, {
        type: 'notification',
        notification: {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          severity: notification.severity,
          payload: notification.payload,
          robotDogId: notification.robotDogId,
          isRead: false as const,
          createdAt: notification.createdAt,
        },
      } as unknown as Parameters<typeof transmit.broadcast>[1])
    } catch (error) {
      logger.error(
        { err: error, userId: notification.userId },
        'NotificationService: SSE broadcast failed'
      )
    }
  }
}
