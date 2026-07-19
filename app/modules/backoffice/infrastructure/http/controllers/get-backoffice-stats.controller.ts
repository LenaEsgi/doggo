import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { GetBackofficeStatsUseCase } from '#app/modules/backoffice/application/usecases/get-backoffice-stats.use-case'
import BackofficeStatsPolicy from '#app/modules/backoffice/application/policies/backoffice-stats.policy'

@inject()
export default class GetBackofficeStatsController {
  constructor(private readonly useCase: GetBackofficeStatsUseCase) {}

  async handle({ response, bouncer }: HttpContext) {
    await bouncer.with(BackofficeStatsPolicy).authorize('view')

    const stats = await this.useCase.execute()

    return response.ok(stats)
  }
}
