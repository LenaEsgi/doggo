import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DeleteUserUseCase } from '#users/application/usecases/delete-user.use-case'
import { deleteUserParamValidator } from '#users/infrastructure/http/validators/delete.user.validator'

@inject()
export default class DeleteUserController {
  constructor(private readonly useCase: DeleteUserUseCase) {}

  async handle({ request, response }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(deleteUserParamValidator, {
      data: request.params(),
    })

    await this.useCase.execute(id)

    response.ok({
      message: 'User deleted successfully',
    })
  }
}
