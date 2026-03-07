import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { AddMissionStepUseCase } from '#app/modules/missions/application/contracts/add-mission-step.use-case'
import { AddStepValidator } from '#app/modules/missions/infrastructure/http/validators/add-step.validator'

@inject()
export default class AddStepController {
  constructor(private addStepUseCase: AddMissionStepUseCase) {}
  public async handle({ request, params }: HttpContext) {
    const payload = await request.validateUsing(AddStepValidator)
    await this.addStepUseCase.execute({ ...payload, missionId: params.id })
  }
}
