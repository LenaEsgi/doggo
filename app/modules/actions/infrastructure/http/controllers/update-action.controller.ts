import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { UpdateActionValidator } from '#app/modules/actions/infrastructure/http/validators/update-action.validator'
import { UpdateActionUseCase } from '#app/modules/actions/application/usecases/update-action.use-case'

@inject()
export default class UpdateActionController {
  constructor(private readonly useCase: UpdateActionUseCase) {}

  async handle({ request, params, response, bouncer }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('update')

    const payload = await request.validateUsing(UpdateActionValidator)

    await this.useCase.execute({
      id: params.id,
      ...payload,
    })

    return response.ok({ message: 'Action updated successfully' })
  }
}
