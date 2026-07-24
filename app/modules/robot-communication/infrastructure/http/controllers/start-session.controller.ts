import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import RobotDogTransformer from '#dogs/infrastructure/http/transformers/robot-dog.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class StartSessionController {
  constructor(
    private startSession: StartSessionCommandUseCase,
    private dogRepository: RobotDogRepository
  ) {}

  public async handle({ params, response, bouncer, logger, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('startSession', params.id)

    logger.info({ robotDogId: params.id }, 'StartSessionController called')

    await this.startSession.execute(params.id)

    // StartSessionCommandUseCase already guarantees the dog exists (it throws
    // RobotDogNotFoundError itself otherwise), so this re-fetch cannot come back null.
    const dog = (await this.dogRepository.findById(RobotDogId.fromString(params.id)))!

    logger.info(
      { robotDogId: params.id, state: dog.state },
      'StartSessionController completed successfully'
    )

    response.status(200)
    return serialize(RobotDogTransformer.transform(dog))
  }
}
