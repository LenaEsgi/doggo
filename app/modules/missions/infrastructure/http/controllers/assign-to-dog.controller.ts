import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { AssignMissionToDogValidator } from '#app/modules/missions/infrastructure/http/validators/assign-mission-to-dog.validator'
import { AssignMissionToDogUseCase } from '#app/modules/missions/application/usecases/assign-mission-to-dog.use-case'

@inject()
export default class AssignToDogController {
  constructor(private assignMissionToDogUseCase: AssignMissionToDogUseCase) {}
  public async handle({ request, params, bouncer }: HttpContext) {
    const missionId = request.input('missionId') as string
    await bouncer.with('MissionPolicy').authorize('assignToDog', params.id, missionId)

    const payload = await request.validateUsing(AssignMissionToDogValidator)

    await this.assignMissionToDogUseCase.execute(payload.missionId, params.id)
  }
}
