import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'

@inject()
export default class MarkNotificationsReadController {
  constructor(private readonly repo: NotificationRepository) {}

  async handle({ response, authenticatedUser }: HttpContext): Promise<void> {
    await this.repo.markAllReadByUser(authenticatedUser.id)
    response.noContent()
  }
}
