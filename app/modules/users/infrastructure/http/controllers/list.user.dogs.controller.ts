import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListUserRobotDogsUseCase } from '#app/modules/users/ownerships/application/usecases/list-user-robot-dogs.use-case'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'
import { showUserParamValidator } from '#users/infrastructure/http/validators/show.user.validator'
import UserPolicy from '#users/application/policies/user.policy'
import { parsePaginationParams } from '#app/modules/share/utils/parse-pagination-params'

@inject()
export default class ListUserDogsController {
  constructor(private readonly useCase: ListUserRobotDogsUseCase) {}

  async handle({ request, response, bouncer, logger }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(showUserParamValidator, {
      data: request.params(),
    })

    await bouncer.with(UserPolicy).authorize('listDogs', id)

    const pagination = parsePaginationParams(request)

    logger.info({ userId: id }, 'ListUserDogsController called')
    const result = await this.useCase.execute(id, pagination)
    logger.info(
      { userId: id, count: result.data.length },
      'ListUserDogsController completed successfully'
    )

    response.ok({
      data: RobotDogSerializer.collection(result.data),
      meta: result.meta,
    })
  }
}
