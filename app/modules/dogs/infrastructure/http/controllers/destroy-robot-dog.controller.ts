import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { DestroyRobotDogUseCase } from '#dogs/application/usecases/destroy-robot-dog.use-case'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class DeleteRobotDogController {
  constructor(private deleteRobotDog: DestroyRobotDogUseCase) {}

  public async handle({ params, response, logger, bouncer }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('destroy')
    logger.info({ robotDogId: params.id }, 'DeleteRobotDogController called')

    await this.deleteRobotDog.execute({ id: params.id })

    logger.info({ robotDogId: params.id }, 'RobotDog successfully deleted')

    return response.status(204)
  }
}
