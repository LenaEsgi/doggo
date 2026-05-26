import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ShowUserUseCase } from '#users/application/usecases/show-user.use-case'
import UserTransformer from '#users/infrastructure/http/transformers/user.transformer'
import { showUserParamValidator } from '#users/infrastructure/http/validators/show.user.validator'
import { UserRole } from '#users/domain/enums/user.role'

@inject()
export default class ShowUserController {
  constructor(private readonly useCase: ShowUserUseCase) {}

  async handle({ request, response, logger, bouncer, authenticatedUser, serialize }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(showUserParamValidator, {
      data: request.params(),
    })

    await bouncer.with('UserPolicy').authorize('show', id)

    logger.info({ userId: id }, 'ShowUserController called')
    const user = await this.useCase.execute(id)

    const isAdmin = authenticatedUser.role === UserRole.ADMIN
    const isSelf = authenticatedUser.id === id
    const { data } = await serialize(UserTransformer.transform(user, isAdmin || isSelf))

    logger.info({ userId: id }, 'ShowUserController completed successfully')
    response.ok({ user: data })
  }
}
