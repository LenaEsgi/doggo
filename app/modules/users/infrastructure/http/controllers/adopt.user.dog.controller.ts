import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AdoptRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/adopt-robot-dog.use-case'
import {
  manageUserDogsBodyValidator,
  manageUserDogsParamsValidator,
} from '#users/infrastructure/http/validators/manage.user.dogs.validator'

@inject()
export default class AdoptUserDogController {
  constructor(private readonly useCase: AdoptRobotDogUseCase) {}

  async handle({ request, response, logger }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(manageUserDogsParamsValidator, {
      data: request.params(),
    })
    const { robotDogId } = await request.validateUsing(manageUserDogsBodyValidator)

    logger.info({ userId: id, robotDogId }, 'AdoptUserDogController called')
    await this.useCase.execute(id, robotDogId)
    logger.info({ userId: id, robotDogId }, 'AdoptUserDogController completed successfully')

    response.ok({
      message: 'RobotDog adopted successfully',
    })
  }
}
