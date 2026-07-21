import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DestroyActionUseCase } from '#app/modules/actions/application/usecases/destroy-action.use-case'

@inject()
export default class DestroyActionController {
  constructor(private readonly useCase: DestroyActionUseCase) {}

  async handle({ params, response, logger, bouncer }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('destroy')

    const id = params.id

    logger.info('Starting Action deactivation', { id })

    await this.useCase.execute({ id })

    logger.info('Action successfully deactivated', { id })

    return response.status(200).json({
      message: 'Action deactivated successfully',
    })
  }
}
