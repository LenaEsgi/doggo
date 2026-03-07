import { HttpContext } from '@adonisjs/core/http'
import { UpdateMissionUseCase } from '#app/modules/missions/application/contracts/update-mission.use-case'
import { inject } from '@adonisjs/core'
import { UpdateMissionValidator } from '#app/modules/missions/infrastructure/http/validators/update-mission.validator'

@inject()
export default class UpdateMissionController {
  constructor(private updateMissionUseCase: UpdateMissionUseCase) {}

  async handle({ request, params, response }: HttpContext) {
    const payload = await request.validateUsing(UpdateMissionValidator)

    await this.updateMissionUseCase.execute({
      id: params.id,
      name: payload.name,
    })

    response.ok
  }
}
