import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { ShowRobotDogUseCase } from '#dogs/application/usecases/show-robot-dog.use-case'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'

@inject()
export default class ShowRobotDogController {
  constructor(private showRobotDog: ShowRobotDogUseCase) {}

  public async handle({ params, logger, response }: HttpContext) {
    logger.info({ robotDogId: params.id }, 'ShowRobotDogController called')

    const robot = await this.showRobotDog.execute({ id: params.id })

    logger.info({ robotDogId: params.id }, 'ShowRobotDogController completed successfully')

    return response.ok(RobotDogSerializer.toJson(robot))
  }
}
