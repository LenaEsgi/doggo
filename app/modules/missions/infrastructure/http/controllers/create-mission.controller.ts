import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { CreateMissionValidator } from '#app/modules/missions/infrastructure/http/validators/create-mission.validator'
import { CreateMissionUseCase } from '#app/modules/missions/application/usecases/create-mission.use-case'
import { CreateMissionDto } from '#app/modules/missions/application/dto/create-mission.dto'

@inject()
export default class CreateMissionController {
  constructor(private createUseCase: CreateMissionUseCase) {}

  public async handle({ request, bouncer, authenticatedUser }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('create')

    const payload = await request.validateUsing(CreateMissionValidator)
    await this.createUseCase.execute(new CreateMissionDto(payload.name, authenticatedUser.id))
  }
}
