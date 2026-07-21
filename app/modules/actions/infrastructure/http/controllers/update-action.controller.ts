import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { UpdateActionValidator } from '#app/modules/actions/infrastructure/http/validators/update-action.validator'
import { UpdateActionUseCase } from '#app/modules/actions/application/usecases/update-action.use-case'
import ActionTransformer from '#app/modules/actions/infrastructure/http/transformers/action.transformer'

@inject()
export default class UpdateActionController {
  constructor(private readonly useCase: UpdateActionUseCase) {}

  async handle({ request, params, response, serialize, bouncer }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('update')

    const payload = await request.validateUsing(UpdateActionValidator)

    const action = await this.useCase.execute({
      id: params.id,
      ...payload,
    })

    const { data } = await serialize(ActionTransformer.transform(action))

    return response.ok({ data })
  }
}
