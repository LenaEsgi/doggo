import { HttpContext } from '@adonisjs/core/http'
import { IndexMissionUseCase } from '#app/modules/missions/application/contracts/index-mission.use-case'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { inject } from '@adonisjs/core'

@inject()
export default class IndexMissionController {
  constructor(private indexUseCase: IndexMissionUseCase) {}
  async handle({ request, serialize, response }: HttpContext) {
    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
    }

    const result = await this.indexUseCase.execute(params)

    const { data } = await serialize(MissionTransformer.transform(result.data))

    response.ok({
      data,
      meta: result.meta,
    })
  }
}
