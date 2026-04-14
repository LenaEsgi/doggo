import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AbandonRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/abandon-robot-dog.use-case'
import {
  manageUserDogsBodyValidatorForAbandon,
  manageUserDogsParamsValidator,
} from '#users/infrastructure/http/validators/manage.user.dogs.validator'

@inject()
export default class AbandonUserDogController {
  constructor(private readonly useCase: AbandonRobotDogUseCase) {}

  async handle({ request, response, logger }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(manageUserDogsParamsValidator, {
      data: request.params(),
    })
    const { robotDogId } = await request.validateUsing(manageUserDogsBodyValidatorForAbandon)

    logger.info({ userId: id, robotDogId }, 'AbandonUserDogController called')
    await this.useCase.execute(id, robotDogId)
    logger.info({ userId: id, robotDogId }, 'AbandonUserDogController completed successfully')

    response.ok({
      message: 'RobotDog abandoned successfully',
    })
  }
}
