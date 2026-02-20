import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DeleteUserService } from '#users/application/contracts/delete.user.service'
import { deleteUserParamValidator } from '#users/infrastructure/http/validators/delete.user.validator'

@inject()
export default class DeleteUserController {
  constructor(private readonly userService: DeleteUserService) {}

  async handle({ request, response }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(deleteUserParamValidator, {
      data: request.params(),
    })

    const isDeleted = await this.userService.delete(id)

    if (!isDeleted) {
      response.notFound({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      })
      return
    }

    response.ok({
      message: 'User deleted successfully',
    })
  }
}
