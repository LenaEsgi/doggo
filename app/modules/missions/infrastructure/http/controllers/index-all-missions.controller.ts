import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { parsePaginationParams } from '#app/modules/share/utils/parse-pagination-params'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { IndexAllMissionsUseCase } from '#app/modules/missions/application/usecases/index-all-missions.use-case'
import MissionPolicy from '#app/modules/missions/application/policies/mission.policy'

@inject()
export default class IndexAllMissionsController {
  constructor(private readonly useCase: IndexAllMissionsUseCase) {}

  async handle({ request, serialize, response, bouncer }: HttpContext) {
    await bouncer.with(MissionPolicy).authorize('index')

    const params = parsePaginationParams(request)

    const result = await this.useCase.execute(params)
    const { data } = await serialize(MissionTransformer.transform(result.data))

    response.ok({ data, meta: result.meta })
  }
}
