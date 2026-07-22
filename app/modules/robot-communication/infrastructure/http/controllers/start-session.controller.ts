import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import RobotDogTransformer from '#dogs/infrastructure/http/transformers/robot-dog.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class StartSessionController {
  constructor(private startSession: StartSessionCommandUseCase) {}

  public async handle({ params, response, bouncer, logger, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('startSession', params.id)

    logger.info({ robotDogId: params.id }, 'StartSessionController called')

    const dog = await this.startSession.execute(params.id)

    logger.info(
      { robotDogId: params.id, state: dog.state },
      'StartSessionController completed successfully'
    )

    response.status(200)
    return serialize(RobotDogTransformer.transform(dog))
  }
}
