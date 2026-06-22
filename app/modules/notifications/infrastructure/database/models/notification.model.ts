import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class NotificationModel extends BaseModel {
  public static table = 'notifications'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare robotDogId: string | null

  @column()
  declare type: string

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare payload: Record<string, unknown> | null

  @column()
  declare isRead: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @beforeCreate()
  static assignUuid(notification: NotificationModel) {
    notification.id = crypto.randomUUID()
  }
}
