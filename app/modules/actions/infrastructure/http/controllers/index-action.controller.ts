import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ActionTransformer from '../transformers/action.transformer.js'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { IndexActionUseCase } from '#app/modules/actions/application/usecases/index-action.use-case'

@inject()
export default class IndexActionController {
  constructor(private readonly useCase: IndexActionUseCase) {}

  async handle({ request, serialize, response, bouncer }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('index')

    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
    }

    const result = await this.useCase.execute(params)

    const { data } = await serialize(ActionTransformer.transform(result.data))

    return response.ok({
      data,
      meta: result.meta,
    })
  }
}
