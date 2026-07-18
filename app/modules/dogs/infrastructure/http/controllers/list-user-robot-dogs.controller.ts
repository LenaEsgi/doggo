import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListUserRobotDogsUseCase } from '#app/modules/users/ownerships/application/usecases/list-user-robot-dogs.use-case'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'
import { listUserRobotDogsParamsValidator } from '#dogs/infrastructure/http/validators/list-user-robot-dogs.validator'
import UserPolicy from '#users/application/policies/user.policy'

@inject()
export default class ListUserRobotDogsController {
  constructor(private readonly useCase: ListUserRobotDogsUseCase) {}

  async handle({ request, response, logger, bouncer }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(listUserRobotDogsParamsValidator, {
      data: request.params(),
    })

    await bouncer.with(UserPolicy).authorize('listDogs', id)

    logger.info({ userId: id }, 'ListUserRobotDogsController called')
    const result = await this.useCase.execute(id)
    logger.info(
      { userId: id, count: result.data.length },
      'ListUserRobotDogsController completed successfully'
    )

    response.ok({
      data: RobotDogSerializer.collection(result.data),
      meta: result.meta,
    })
  }
}
