import type { HttpContext } from '@adonisjs/core/http'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { inject } from '@adonisjs/core'
import { ShowMissionUseCase } from '#app/modules/missions/application/usecases/show-mission.use-case'

@inject()
export default class ShowMissionController {
  constructor(private showMissionUseCase: ShowMissionUseCase) {}

  async handle({ serialize, params, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('show', params.id)

    const { mission, creator } = await this.showMissionUseCase.execute(params.id)

    return serialize(MissionTransformer.transform(mission, creator))
  }
}
