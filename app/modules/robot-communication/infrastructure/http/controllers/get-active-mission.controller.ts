import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { GetActiveMissionRunUseCase } from '#app/modules/robot-communication/application/use-cases/commands/get-active-mission-run.use-case'
import MissionRunTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class GetActiveMissionController {
  constructor(private getActiveMissionRun: GetActiveMissionRunUseCase) {}

  public async handle({ params, response, bouncer, logger, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('viewMission', params.id)

    logger.info({ robotDogId: params.id }, 'GetActiveMissionController called')

    const run = await this.getActiveMissionRun.execute(params.id)

    if (!run) {
      return response.ok(null)
    }

    return serialize(MissionRunTransformer.transform(run))
  }
}
