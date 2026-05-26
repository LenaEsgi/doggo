import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { CreateMissionValidator } from '#app/modules/missions/infrastructure/http/validators/create-mission.validator'
import { CreateMissionUseCase } from '#app/modules/missions/application/usecases/create-mission.use-case'

@inject()
export default class CreateMissionController {
  constructor(private createUseCase: CreateMissionUseCase) {}

  public async handle({ request, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('create')

    const payload = await request.validateUsing(CreateMissionValidator)
    await this.createUseCase.execute(payload)
  }
}
