import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'

@inject()
export default class ListNotificationsController {
  constructor(private readonly repo: NotificationRepository) {}

  async handle({ request, response, authenticatedUser }: HttpContext): Promise<void> {
    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
    }

    const result = await this.repo.findByUser(authenticatedUser.id, params)

    response.ok({
      data: result.data,
      meta: result.meta,
    })
  }
}
