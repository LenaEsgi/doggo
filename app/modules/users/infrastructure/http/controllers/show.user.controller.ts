import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ShowUserUseCase } from '#users/application/usecases/show-user.use-case'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'
import { showUserParamValidator } from '#users/infrastructure/http/validators/show.user.validator'

@inject()
export default class ShowUserController {
  constructor(private readonly useCase: ShowUserUseCase) {}

  async handle({ request, response, logger }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(showUserParamValidator, {
      data: request.params(),
    })

    logger.info({ userId: id }, 'ShowUserController called')
    const user = await this.useCase.execute(id)

    logger.info({ userId: id }, 'ShowUserController completed successfully')
    response.ok({
      user: UserSerializer.toJson(user),
    })
  }
}
