import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import RemoveMissionStep from '#app/modules/missions/application/usecases/remove-mission-step.use-case'

@inject()
export default class DestroyMissionStepController {
  constructor(private removeMissionStep: RemoveMissionStep) {}

  public async handle({ params, response }: HttpContext) {
    await this.removeMissionStep.execute({
      missionId: params.missionId,
      stepId: params.stepId,
    })

    return response.status(200)
  }
}
