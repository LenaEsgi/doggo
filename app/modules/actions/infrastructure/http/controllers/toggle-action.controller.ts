import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ToggleActionValidator } from '#app/modules/actions/infrastructure/http/validators/toggle-action.validator'
import { ToggleActionUseCase } from '#app/modules/actions/application/usecases/toggle-action.use-case'
import { ToggleActionDto } from '#app/modules/actions/application/dto/toggle-action.dto'

@inject()
export default class ToggleActionController {
  constructor(private readonly useCase: ToggleActionUseCase) {}

  async handle({ request, params, response, bouncer }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('update')

    const payload = await request.validateUsing(ToggleActionValidator)
    await this.useCase.execute(new ToggleActionDto(params.id, payload.isActive))

    return response.ok({ message: 'Action toggled successfully' })
  }
}
