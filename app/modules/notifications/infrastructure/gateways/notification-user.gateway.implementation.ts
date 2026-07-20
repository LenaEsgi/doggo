import { inject } from '@adonisjs/core'
import { NotificationUserGateway } from '#app/modules/notifications/domain/gateways/notification-user.gateway'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import type { UserLocale } from '#users/domain/user.entity'

const DEFAULT_LOCALE: UserLocale = 'fr'

@inject()
export class NotificationUserGatewayImplementation extends NotificationUserGateway {
  constructor(private readonly userReadRepository: UserReadRepository) {
    super()
  }

  async findLocaleById(userId: string): Promise<UserLocale> {
    const user = await this.userReadRepository.findById(userId)
    return user?.locale ?? DEFAULT_LOCALE
  }

  async findLocalesByIds(userIds: string[]): Promise<Map<string, UserLocale>> {
    const users = await this.userReadRepository.findByIds(userIds)
    const locales = new Map<string, UserLocale>()

    for (const user of users) {
      locales.set(user.id, user.locale)
    }

    return locales
  }
}
