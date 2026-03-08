import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { UpdateActionValidator } from '../validators/update-action.validator.js'
import { UpdateActionUseCase } from '#app/modules/actions/application/usecases/update-action.use-case'

@inject()
export default class UpdateActionController {
  constructor(private readonly useCase: UpdateActionUseCase) {}

  async handle({ request, params, response }: HttpContext) {
    const payload = await request.validateUsing(UpdateActionValidator)

    await this.useCase.execute({
      id: params.id,
      ...payload,
    })

    return response.ok({ message: 'Action updated successfully' })
  }
}
