import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ShowUserService } from '#users/application/contracts/show.user.service'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'
import { showUserParamValidator } from '#users/infrastructure/http/validators/show.user.validator'

@inject()
export default class ShowUserController {
  constructor(private readonly userService: ShowUserService) {}

  async handle({ request, response }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(showUserParamValidator, {
      data: request.params(),
    })

    const user = await this.userService.show(id)

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
