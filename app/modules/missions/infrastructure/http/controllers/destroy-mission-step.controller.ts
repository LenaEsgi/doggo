import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { RemoveMissionStepUseCase } from '#app/modules/missions/application/contracts/remove-mission-step.use-case'

@inject()
export default class DestroyMissionStepController {
  constructor(
    private removeMissionStep: RemoveMissionStepUseCase
  ) {}
  public async handle({ params, response }: HttpContext) {
      await this.removeMissionStep.execute({
        missionId: params.missionId,
        stepId: params.stepId,
      })

      return response.status(200)
  }
}
