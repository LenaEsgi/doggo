import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { ShowRobotDogUseCase } from '#dogs/application/usecases/show-robot-dog.use-case'
import RobotDogTransformer from '#dogs/infrastructure/http/transformers/robot-dog.transformer'

@inject()
export default class ShowRobotDogController {
  constructor(private showRobotDog: ShowRobotDogUseCase) {}

  public async handle({ params, logger, serialize }: HttpContext) {
    logger.info({ robotDogId: params.id }, 'ShowRobotDogController called')

    const robot = await this.showRobotDog.execute({ id: params.id })

    logger.info({ robotDogId: params.id }, 'ShowRobotDogController completed successfully')

    return serialize(RobotDogTransformer.transform(robot))
  }
}
