import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import { NotificationUserGateway } from '#app/modules/notifications/domain/gateways/notification-user.gateway'
import { NotificationMessageTranslator } from '#app/modules/notifications/application/notification-message.translator'
import type { UserLocale } from '#users/domain/user.entity'
import type {
  NotificationRecord,
  Severity,
} from '#app/modules/notifications/domain/contracts/notification.repository'

export type NotificationType =
  | 'dog.assigned'
  | 'dog.revoked'
  | 'dog.member.assigned'
  | 'dog.member.revoked'
  | 'dog.offline'
  | 'dog.error'
  | 'dog.battery_low'
  | 'mission.started'
  | 'mission.completed'
  | 'mission.failed'
  | 'mission.start_failed'
  | 'mission.skipped'
  | 'mission.interrupted'
  | 'mission.assigned_to_dog'
  | 'mission.removed_from_dog'

const AUDIT_LOCALE: UserLocale = 'fr'

@inject()
export class NotificationService {
  private readonly translator = new NotificationMessageTranslator()

  constructor(
    private readonly repo: NotificationRepository,
    private readonly broadcaster: RealtimeBroadcaster,
    private readonly userGateway: NotificationUserGateway
  ) {}

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
      message: this.translator.translate(type, payload, AUDIT_LOCALE),
      severity,
      payload: payload ?? null,
      robotDogId: robotDogId ?? null,
    })

    const locale = await this.userGateway.findLocaleById(userId)
    this.broadcast(notification, locale)
  }

  async createBulk(
    userIds: string[],
    type: NotificationType,
    severity: Severity,
    payload?: Record<string, unknown>,
    robotDogId?: string
  ): Promise<void> {
    if (userIds.length === 0) return

    const message = this.translator.translate(type, payload, AUDIT_LOCALE)
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

    const locales = await this.userGateway.findLocalesByIds(userIds)

    for (const notification of notifications) {
      const locale = locales.get(notification.userId) ?? AUDIT_LOCALE
      this.broadcast(notification, locale)
    }
  }

  private broadcast(notification: NotificationRecord, locale: UserLocale): void {
    try {
      const message = this.translator.translate(
        notification.type as NotificationType,
        notification.payload,
        locale
      )

      this.broadcaster.broadcast(`users/${notification.userId}`, {
        type: 'notification',
        notification: {
          id: notification.id,
          type: notification.type,
          message,
          severity: notification.severity,
          payload: notification.payload,
          robotDogId: notification.robotDogId,
          isRead: false as const,
          createdAt: notification.createdAt,
        },
      })
    } catch (error) {
      logger.error(
        { err: error, userId: notification.userId },
        'NotificationService: SSE broadcast failed'
      )
    }
  }
}
