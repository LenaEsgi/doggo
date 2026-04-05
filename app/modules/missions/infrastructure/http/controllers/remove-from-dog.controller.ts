import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { RemoveMissionToDogUseCase } from '#app/modules/missions/application/usecases/remove-mission-to-dog.use-case'

@inject()
export default class RemoveFromDogController {
  constructor(private removeFromDogController: RemoveMissionToDogUseCase) {}
  public async handle({ params }: HttpContext) {
    await this.removeFromDogController.execute(params.missionId, params.id)
  }
}
