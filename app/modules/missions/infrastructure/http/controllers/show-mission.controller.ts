import type { HttpContext } from '@adonisjs/core/http'
import { ShowMissionUseCase } from '#app/modules/missions/application/contracts/show-mission.use-case'
import MissionTransformer from '#app/modules/missions/infrastructure/http/transformers/mission.transformer'
import { inject } from '@adonisjs/core'

@inject()
export default class ShowMissionController {
  constructor(private showMissionUseCase: ShowMissionUseCase) {}
  async handle({ serialize, params }: HttpContext) {
    const mission = await this.showMissionUseCase.execute(params.id)

    return serialize(MissionTransformer.transform(mission))
  }
}
