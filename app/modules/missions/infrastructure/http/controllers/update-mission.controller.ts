import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { UpdateMissionValidator } from '#app/modules/missions/infrastructure/http/validators/update-mission.validator'
import { UpdateMissionUseCase } from '#app/modules/missions/application/usecases/update-mission.use-case'

@inject()
export default class UpdateMissionController {
  constructor(private updateMissionUseCase: UpdateMissionUseCase) {}

  async handle({ request, params, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('update', params.id)

    const payload = await request.validateUsing(UpdateMissionValidator)

    await this.updateMissionUseCase.execute({
      id: params.id,
      name: payload.name,
    })

    response.ok({ message: 'Mission updated successfully' })
  }
}
