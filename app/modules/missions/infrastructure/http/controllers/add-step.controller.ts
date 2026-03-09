import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { AddStepValidator } from '#app/modules/missions/infrastructure/http/validators/add-step.validator'
import { AddMissionStepUseCase } from '#app/modules/missions/application/usecases/add-mission-step.use-case'

@inject()
export default class AddStepController {
  constructor(private addStepUseCase: AddMissionStepUseCase) {}
  public async handle({ request, params }: HttpContext) {
    const payload = await request.validateUsing(AddStepValidator)
    await this.addStepUseCase.execute({ ...payload, missionId: params.id })
  }
}
