import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import RobotDogTransformer from '#dogs/infrastructure/http/transformers/robot-dog.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class StopMissionController {
  constructor(private stopMission: StopMissionCommandUseCase) {}

  public async handle({ params, response, bouncer, logger, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('stopMission', params.id)

    logger.info({ robotDogId: params.id }, 'StopMissionController called')

    const dog = await this.stopMission.execute(params.id)

    logger.info(
      { robotDogId: params.id, state: dog.state },
      'StopMissionController completed successfully'
    )

    response.status(200)
    return serialize(RobotDogTransformer.transform(dog))
  }
}
