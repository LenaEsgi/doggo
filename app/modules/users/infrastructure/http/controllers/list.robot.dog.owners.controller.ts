import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListRobotDogOwnersUseCase } from '#app/modules/users/ownerships/application/usecases/list-robot-dog-owners.use-case'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'
import { showUserParamValidator } from '#users/infrastructure/http/validators/show.user.validator'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'

@inject()
export default class ListRobotDogOwnersController {
  constructor(private readonly useCase: ListRobotDogOwnersUseCase) {}

  async handle({ request, response, logger }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(showUserParamValidator, {
      data: request.params(),
    })

    const pagination: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
    }

    logger.info({ robotDogId: id }, 'ListRobotDogOwnersController called')
    const users = await this.useCase.execute(id, pagination)
    logger.info(
      { robotDogId: id, count: users.data.length },
      'ListRobotDogOwnersController completed successfully'
    )

    response.ok({
      meta: users.meta,
      data: UserSerializer.collection(users.data),
    })
  }
}
