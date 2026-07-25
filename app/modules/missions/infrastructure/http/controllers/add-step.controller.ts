import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { AddStepValidator } from '#app/modules/missions/infrastructure/http/validators/add-step.validator'
import { AddMissionStepUseCase } from '#app/modules/missions/application/usecases/add-mission-step.use-case'
import { ShowMissionUseCase } from '#app/modules/missions/application/usecases/show-mission.use-case'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'

@inject()
export default class AddStepController {
  constructor(
    private addStepUseCase: AddMissionStepUseCase,
    private showMissionUseCase: ShowMissionUseCase
  ) {}

  public async handle({ request, params, bouncer, serialize }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('addStep', params.id)

    const payload = await request.validateUsing(AddStepValidator)
    await this.addStepUseCase.execute({ ...payload, missionId: params.id })

    const { mission, creator } = await this.showMissionUseCase.execute(params.id)
    return serialize(MissionTransformer.transform(mission, creator))
  }
}
