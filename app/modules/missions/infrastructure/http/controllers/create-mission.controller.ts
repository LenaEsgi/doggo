import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { CreateMissionUseCase } from '#app/modules/missions/application/contracts/create-mission.use-case'
import { CreateMissionValidator } from '#app/modules/missions/infrastructure/http/validators/create-mission.validator'

@inject()
export default class CreateMissionController {

  constructor(private createUseCase: CreateMissionUseCase) {}
  public async handle({ request }: HttpContext) {
    const payload = await request.validateUsing(CreateMissionValidator)
    console.log(payload)
    await this.createUseCase.execute(payload)
  }
}
