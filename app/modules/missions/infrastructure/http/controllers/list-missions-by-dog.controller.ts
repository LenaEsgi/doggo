import { HttpContext } from '@adonisjs/core/http'
import { parsePaginationParams } from '#app/modules/share/utils/parse-pagination-params'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { inject } from '@adonisjs/core'
import { ListMissionsByDogUseCase } from '#app/modules/missions/application/usecases/list-missions-by-dog.use-case'

@inject()
export default class ListMissionsByDogController {
  constructor(private listMissionsByDogUseCase: ListMissionsByDogUseCase) {}

  async handle({ request, serialize, response, params, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('listByDog', params.id)

    const pagination = parsePaginationParams(request)
    const dogId = params.id

    const result = await this.listMissionsByDogUseCase.execute(dogId, pagination)

    const { data } = await serialize(MissionTransformer.transform(result.data))

    response.ok({
      data,
      meta: result.meta,
    })
  }
}
