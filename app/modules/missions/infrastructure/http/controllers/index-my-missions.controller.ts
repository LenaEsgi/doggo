import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { parsePaginationParams } from '#app/modules/share/utils/parse-pagination-params'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { IndexMyMissionsUseCase } from '#app/modules/missions/application/usecases/index-my-missions.use-case'
import MissionPolicy from '#app/modules/missions/application/policies/mission.policy'

@inject()
export default class IndexMyMissionsController {
  constructor(private readonly useCase: IndexMyMissionsUseCase) {}

  async handle({ request, serialize, response, bouncer, authenticatedUser }: HttpContext) {
    await bouncer.with(MissionPolicy).authorize('indexMine')

    const params = parsePaginationParams(request)

    const result = await this.useCase.execute(authenticatedUser.id, params)
    const { data } = await serialize(MissionTransformer.transform(result.data))

    response.ok({ data, meta: result.meta })
  }
}
