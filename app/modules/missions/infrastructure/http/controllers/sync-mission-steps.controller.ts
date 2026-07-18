import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { SyncMissionStepsUseCase } from '#app/modules/missions/application/usecases/sync-mission-steps.use-case'
import { SyncMissionStepsValidator } from '#app/modules/missions/infrastructure/http/validators/sync-mission-steps.validator'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'

@inject()
export default class SyncMissionStepsController {
  constructor(private readonly syncMissionStepsUseCase: SyncMissionStepsUseCase) {}

  public async handle({ request, params, bouncer, serialize }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('syncSteps', params.id)

    const payload = await request.validateUsing(SyncMissionStepsValidator)

    const mission = await this.syncMissionStepsUseCase.execute({
      missionId: params.id,
      steps: payload.steps,
    })

    return serialize(MissionTransformer.transform(mission))
  }
}
