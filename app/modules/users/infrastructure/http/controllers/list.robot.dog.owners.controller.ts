import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListRobotDogOwnersUseCase } from '#app/modules/users/ownerships/application/usecases/list-robot-dog-owners.use-case'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'
import { showUserParamValidator } from '#users/infrastructure/http/validators/show.user.validator'

@inject()
export default class ListRobotDogOwnersController {
  constructor(private readonly useCase: ListRobotDogOwnersUseCase) {}

  async handle({ request, response, logger }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(showUserParamValidator, {
      data: request.params(),
    })

    logger.info({ robotDogId: id }, 'ListRobotDogOwnersController called')
    const users = await this.useCase.execute(id)
    logger.info(
      { robotDogId: id, count: users.length },
      'ListRobotDogOwnersController completed successfully'
    )

    response.ok({
      users: UserSerializer.collection(users),
    })
  }
}
