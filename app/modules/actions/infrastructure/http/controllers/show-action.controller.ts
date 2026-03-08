import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ActionTransformer from '../transformers/action.transformer.js'
import { ShowActionUseCase } from '#app/modules/actions/application/usecases/show-action.use-case'

@inject()
export default class ShowActionController {
  constructor(private readonly useCase: ShowActionUseCase) {}

  async handle({ serialize, params }: HttpContext) {
    const result = await this.useCase.execute({ id: params.id })

    return serialize(ActionTransformer.transform(result))
  }
}
