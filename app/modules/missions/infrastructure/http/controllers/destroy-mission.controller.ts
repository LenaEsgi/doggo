import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DestroyMissionUseCase } from '#app/modules/missions/application/usecases/destroy-mission.use-case'

@inject()
export default class DestroyMissionController {
  constructor(private destroyMission: DestroyMissionUseCase) {}

  async handle({ params, response }: HttpContext) {
    await this.destroyMission.execute({ id: params.id })
    return response.noContent()
  }
}
