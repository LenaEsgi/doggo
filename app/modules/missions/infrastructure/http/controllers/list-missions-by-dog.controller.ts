import { HttpContext } from '@adonisjs/core/http'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { inject } from '@adonisjs/core'
import { ListMissionsByDogUseCase } from '#app/modules/missions/application/usecases/list-missions-by-dog.use-case'

@inject()
export default class ListMissionsByDogController {
  constructor(private listMissionsByDogUseCase: ListMissionsByDogUseCase) {}

  async handle({ request, serialize, response, params, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('listByDog', params.id)

    const pagination: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
    }
    const dogId = params.id

    const result = await this.listMissionsByDogUseCase.execute(dogId, pagination)

    const { data } = await serialize(MissionTransformer.transform(result.data))

    response.ok({
      data,
      meta: result.meta,
    })
  }
}
