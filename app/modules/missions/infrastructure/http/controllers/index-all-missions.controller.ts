import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { IndexAllMissionsUseCase } from '#app/modules/missions/application/usecases/index-all-missions.use-case'
import MissionPolicy from '#app/modules/missions/application/policies/mission.policy'

@inject()
export default class IndexAllMissionsController {
  constructor(private readonly useCase: IndexAllMissionsUseCase) {}

  async handle({ request, serialize, response, bouncer }: HttpContext) {
    await bouncer.with(MissionPolicy).authorize('index')

    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
      search: request.input('search') || undefined,
    }

    const result = await this.useCase.execute(params)
    const { data } = await serialize(MissionTransformer.transform(result.data))

    response.ok({ data, meta: result.meta })
  }
}
