import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import RobotDogTransformer from '#dogs/infrastructure/http/transformers/robot-dog.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class EndSessionController {
  constructor(
    private endSession: EndSessionCommandUseCase,
    private dogRepository: RobotDogRepository
  ) {}

  public async handle({ params, response, bouncer, logger, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('endSession', params.id)

    logger.info({ robotDogId: params.id }, 'EndSessionController called')

    await this.endSession.execute(params.id)

    // EndSessionCommandUseCase already guarantees the dog exists (it throws
    // RobotDogNotFoundError itself otherwise), so this re-fetch cannot come back null.
    const dog = (await this.dogRepository.findById(RobotDogId.fromString(params.id)))!

    logger.info(
      { robotDogId: params.id, state: dog.state },
      'EndSessionController completed successfully'
    )

    response.status(200)
    return serialize(RobotDogTransformer.transform(dog))
  }
}
