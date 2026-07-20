import { NotificationMessageTranslator } from '#app/modules/notifications/application/notification-message.translator'
import type { NotificationType } from '#app/modules/notifications/application/notification.service'
import type { NotificationRecord } from '#app/modules/notifications/domain/contracts/notification.repository'
import type { UserLocale } from '#users/domain/user.entity'

export class NotificationTransformer {
  private readonly translator = new NotificationMessageTranslator()

  toJSON(record: NotificationRecord, locale: UserLocale) {
    return {
      id: record.id,
      type: record.type,
      message: this.translator.translate(record.type as NotificationType, record.payload, locale),
      severity: record.severity,
      payload: record.payload,
      robotDogId: record.robotDogId,
      isRead: record.isRead,
      createdAt: record.createdAt,
    }
  }

  toJSONList(records: NotificationRecord[], locale: UserLocale) {
    return records.map((record) => this.toJSON(record, locale))
  }
}
