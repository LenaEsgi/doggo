import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ActionTransformer from '#app/modules/actions/infrastructure/http/transformers/action.transformer'
import { type IndexActionOptions } from '#app/modules/actions/domain/contracts/action.repository'
import { IndexActionUseCase } from '#app/modules/actions/application/usecases/index-action.use-case'
import { UserRole } from '#users/domain/enums/user.role'
import { parsePaginationParams } from '#app/modules/share/utils/parse-pagination-params'

@inject()
export default class IndexActionController {
  constructor(private readonly useCase: IndexActionUseCase) {}

  async handle({ request, serialize, response, bouncer, authenticatedUser }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('index')

    const isAdmin = authenticatedUser.role === UserRole.ADMIN

    const params: IndexActionOptions = {
      ...parsePaginationParams(request),
      includeInactive: isAdmin && request.input('includeInactive') === 'true',
    }

    const result = await this.useCase.execute(params)

    const { data } = await serialize(ActionTransformer.transform(result.data))

    return response.ok({
      data,
      meta: result.meta,
    })
  }
}
