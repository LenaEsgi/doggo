import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { UpdateUserService } from '#users/application/contracts/update.user.service'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'
import {
  updateUserParamValidator,
  updateUserValidator,
} from '#users/infrastructure/http/validators/update.user.validator'

@inject()
export default class UpdateUserController {
  constructor(private readonly userService: UpdateUserService) {}

  async handle({ request, response }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(updateUserParamValidator, {
      data: request.params(),
    })

    const payload = await request.validateUsing(updateUserValidator)
    const user = await this.userService.update(id, payload)

    if (!user) {
      response.notFound({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      })
      return
    }

    response.ok({
      message: 'User updated successfully',
      user: UserSerializer.toJson(user),
    })
  }
}
