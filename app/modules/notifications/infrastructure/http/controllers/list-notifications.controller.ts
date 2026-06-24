import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import {
  NotificationRepository,
  type FindNotificationsParams,
  type NotificationTab,
} from '#app/modules/notifications/domain/contracts/notification.repository'

@inject()
export default class ListNotificationsController {
  constructor(private readonly repo: NotificationRepository) {}

  async handle({ request, response, authenticatedUser }: HttpContext): Promise<void> {
    const rawTab = request.input('tab', 'all')
    const tab: NotificationTab = rawTab === 'unread' ? 'unread' : 'all'

    const params: FindNotificationsParams = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
      tab,
      search: request.input('search') || undefined,
    }

    const result = await this.repo.findByUser(authenticatedUser.id, params)

    response.ok({
      data: result.data,
      meta: result.meta,
    })
  }
}
