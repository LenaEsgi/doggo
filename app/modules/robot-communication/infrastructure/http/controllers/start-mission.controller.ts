import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { startMissionValidator } from '../validators/start-mission.validator.js'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import MissionRunTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run.transformer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class StartMissionController {
  constructor(private startMission: StartMissionCommandUseCase) {}

  public async handle({ request, params, response, bouncer, logger, serialize }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('startMission', params.id)

    const payload = await request.validateUsing(startMissionValidator)

    logger.info(
      { robotDogId: params.id, missionId: payload.missionId },
      'StartMissionController called'
    )

    const run = await this.startMission.execute(params.id, payload.missionId)

    logger.info(
      { robotDogId: params.id, missionId: payload.missionId, runId: run.id.value },
      'StartMissionController completed successfully'
    )

    response.status(201)
    return serialize(MissionRunTransformer.transform(run))
  }
}
