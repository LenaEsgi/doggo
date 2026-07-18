import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { CreateActionValidator } from '#app/modules/actions/infrastructure/http/validators/create-action.validator'
import { CreateActionUseCase } from '#app/modules/actions/application/usecases/create-action.use-case'

@inject()
export default class CreateActionController {
  constructor(private readonly useCase: CreateActionUseCase) {}

  async handle({ request, response, logger, bouncer }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('create')

    const validatedData = await request.validateUsing(CreateActionValidator)

    logger.info('Starting Action creation', { data: validatedData })

    await this.useCase.execute(validatedData)

    logger.info('Action successfully created')

    return response.status(201).json({
      message: 'Action created successfully',
    })
  }
}
