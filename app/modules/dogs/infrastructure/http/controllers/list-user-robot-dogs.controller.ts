import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListUserRobotDogsUseCase } from '#app/modules/users/ownerships/application/usecases/list-user-robot-dogs.use-case'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'
import { listUserRobotDogsParamsValidator } from '#dogs/infrastructure/http/validators/list-user-robot-dogs.validator'

@inject()
export default class ListUserRobotDogsController {
  constructor(private readonly useCase: ListUserRobotDogsUseCase) {}

  async handle({ request, response, logger }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(listUserRobotDogsParamsValidator, {
      data: request.params(),
    })

    logger.info({ userId: id }, 'ListUserRobotDogsController called')
    const dogs = await this.useCase.execute(id)
    logger.info(
      { userId: id, count: dogs.length },
      'ListUserRobotDogsController completed successfully'
    )

    response.ok({
      dogs: RobotDogSerializer.collection(dogs),
    })
  }
}
