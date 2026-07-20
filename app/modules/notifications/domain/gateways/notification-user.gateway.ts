import type { UserLocale } from '#users/domain/user.entity'

export abstract class NotificationUserGateway {
  abstract findLocaleById(userId: string): Promise<UserLocale>
  abstract findLocalesByIds(userIds: string[]): Promise<Map<string, UserLocale>>
}
