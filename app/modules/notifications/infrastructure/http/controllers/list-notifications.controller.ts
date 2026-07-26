import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import {
  NotificationRepository,
  type FindNotificationsParams,
  type NotificationTab,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import { NotificationTransformer } from '#app/modules/notifications/infrastructure/http/transformers/notification.transformer'
import { parsePaginationParams } from '#app/modules/share/utils/parse-pagination-params'

@inject()
export default class ListNotificationsController {
  private readonly transformer = new NotificationTransformer()

  constructor(private readonly repo: NotificationRepository) {}

  async handle({ request, response, authenticatedUser }: HttpContext): Promise<void> {
    const rawTab = request.input('tab', 'all')
    const tab: NotificationTab = rawTab === 'unread' ? 'unread' : 'all'

    const params: FindNotificationsParams = { ...parsePaginationParams(request), tab }

    const result = await this.repo.findByUser(authenticatedUser.id, params)

    response.ok({
      data: this.transformer.toJSONList(result.data, authenticatedUser.locale),
      meta: result.meta,
    })
  }
}
