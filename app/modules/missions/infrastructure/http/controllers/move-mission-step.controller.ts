import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { MoveMissionStepValidator } from '#app/modules/missions/infrastructure/http/validators/move-mission-step.validator'
import { MoveMissionStepUseCase } from '#app/modules/missions/application/usecases/move-mission-step.use-case'

@inject()
export default class MoveMissionStepController {
  constructor(private moveMissionStep: MoveMissionStepUseCase) {}

  public async handle({ params, request, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('moveStep', params.missionId)

    const payload = await request.validateUsing(MoveMissionStepValidator)

    const fullPayload = { ...payload, missionId: params.missionId, stepId: params.stepId }

    await this.moveMissionStep.execute(fullPayload)

    return response.status(200)
  }
}
