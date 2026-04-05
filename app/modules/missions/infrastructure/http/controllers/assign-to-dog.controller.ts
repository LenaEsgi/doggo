import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { AssignMissionToDogValidator } from '#app/modules/missions/infrastructure/http/validators/assign-mission-to-dog.validator'
import { AssignMissionToDogUseCase } from '#app/modules/missions/application/usecases/assign-mission-to-dog.use-case'

@inject()
export default class AssignToDogController {
  constructor(private assignMissionToDogUseCase: AssignMissionToDogUseCase) {}
  public async handle({ request, params }: HttpContext) {
    const payload = await request.validateUsing(AssignMissionToDogValidator)

    await this.assignMissionToDogUseCase.execute(payload.missionId, params.id)
  }
}
