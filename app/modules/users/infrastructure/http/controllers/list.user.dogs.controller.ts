import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListUserRobotDogsUseCase } from '#app/modules/users/ownerships/application/usecases/list-user-robot-dogs.use-case'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'
import { showUserParamValidator } from '#users/infrastructure/http/validators/show.user.validator'
import UserPolicy from '#users/application/policies/user.policy'

@inject()
export default class ListUserDogsController {
  constructor(private readonly useCase: ListUserRobotDogsUseCase) {}

  async handle({ request, response, bouncer, logger }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(showUserParamValidator, {
      data: request.params(),
    })

    await bouncer.with(UserPolicy).authorize('listDogs', id)

    logger.info({ userId: id }, 'ListUserDogsController called')
    const dogs = await this.useCase.execute(id)
    logger.info({ userId: id, count: dogs.length }, 'ListUserDogsController completed successfully')

    response.ok({
      dogs: RobotDogSerializer.collection(dogs),
    })
  }
}
