import { HttpContext } from '@adonisjs/core/http'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { inject } from '@adonisjs/core'
import { IndexMissionUseCase } from '#app/modules/missions/application/usecases/index-mission.use-case'
import { UserRole } from '#users/domain/enums/user.role'

@inject()
export default class IndexMissionController {
  constructor(private indexUseCase: IndexMissionUseCase) {}

  async handle({ request, serialize, response, bouncer, authenticatedUser }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('index')

    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
      search: request.input('search'),
    }

    const userId = authenticatedUser.role === UserRole.ADMIN ? undefined : authenticatedUser.id
    const result = await this.indexUseCase.execute(params, userId)

    const { data } = await serialize(MissionTransformer.transform(result.data))

    response.ok({
      data,
      meta: result.meta,
    })
  }
}
