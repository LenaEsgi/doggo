import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import RobotDogTransformer from '#dogs/infrastructure/http/transformers/robot-dog.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class EndSessionController {
  constructor(private endSession: EndSessionCommandUseCase) {}

  public async handle({ params, response, bouncer, logger, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('endSession', params.id)

    logger.info({ robotDogId: params.id }, 'EndSessionController called')

    const dog = await this.endSession.execute(params.id)

    logger.info(
      { robotDogId: params.id, state: dog.state },
      'EndSessionController completed successfully'
    )

    response.status(200)
    return serialize(RobotDogTransformer.transform(dog))
  }
}
