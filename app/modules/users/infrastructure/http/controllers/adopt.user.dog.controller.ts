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

  async handle({ request, response, logger, bouncer }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(manageUserDogsParamsValidator, {
      data: request.params(),
    })

    await bouncer.with('UserPolicy').authorize('adopt', id)

    const { serialNumber, key } = await request.validateUsing(manageUserDogsBodyValidator)

    logger.info({ userId: id, serialNumber }, 'AdoptUserDogController called')
    await this.useCase.execute(id, serialNumber, key)
    logger.info({ userId: id, serialNumber }, 'AdoptUserDogController completed successfully')

    response.ok({
      message: 'RobotDog adopted successfully',
    })
  }
}
