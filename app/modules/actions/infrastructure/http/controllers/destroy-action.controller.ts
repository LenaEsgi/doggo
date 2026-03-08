import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DestroyActionUseCase } from '#app/modules/actions/application/usecases/destroy-action.use-case'

@inject()
export default class DestroyActionController {
  constructor(private readonly useCase: DestroyActionUseCase) {}

  async handle({ params, response, logger }: HttpContext) {
    const id = params.id

    logger.info('Starting Action deletion', { id })

    await this.useCase.execute({ id })

    logger.info('Action successfully deleted', { id })

    return response.status(204).json({
      message: 'Action deleted successfully',
    })
  }
}
