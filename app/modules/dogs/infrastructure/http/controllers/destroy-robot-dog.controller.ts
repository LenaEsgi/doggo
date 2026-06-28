import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { DestroyRobotDogUseCase } from '#dogs/application/usecases/destroy-robot-dog.use-case'
import { isAdmin } from '#app/modules/share/abilities/shared.abilities'

@inject()
export default class DeleteRobotDogController {
  constructor(private deleteRobotDog: DestroyRobotDogUseCase) {}

  public async handle({ params, response, logger, bouncer }: HttpContext) {
    await bouncer.authorize(isAdmin)
    logger.info({ robotDogId: params.id }, 'DeleteRobotDogController called')

    await this.deleteRobotDog.execute({ id: params.id })

    logger.info({ robotDogId: params.id }, 'RobotDog successfully deleted')

    return response.status(204)
  }
}
