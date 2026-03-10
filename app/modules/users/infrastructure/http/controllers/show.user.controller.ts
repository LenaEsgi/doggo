import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ShowUserUseCase } from '#users/application/usecases/show-user.use-case'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'
import { showUserParamValidator } from '#users/infrastructure/http/validators/show.user.validator'

@inject()
export default class ShowUserController {
  constructor(private readonly useCase: ShowUserUseCase) {}

  async handle({ request, response }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(showUserParamValidator, {
      data: request.params(),
    })

    const user = await this.useCase.execute(id)

    if (!user) {
      response.notFound({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      })
      return
    }

    response.ok({
      user: UserSerializer.toJson(user),
    })
  }
}
