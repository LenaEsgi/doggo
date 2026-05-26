import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { IndexUserUseCase } from '#users/application/usecases/index-user.use-case'
import UserTransformer from '#users/infrastructure/http/transformers/user.transformer'
import { UserRole } from '#users/domain/enums/user.role'

@inject()
export default class IndexUserController {
  constructor(private readonly useCase: IndexUserUseCase) {}

  async handle({
    response,
    logger,
    bouncer,
    authenticatedUser,
    serialize,
  }: HttpContext): Promise<void> {
    await bouncer.with('UserPolicy').authorize('index')

    logger.info({}, 'IndexUserController called')
    const users = await this.useCase.execute()

    const isAdmin = authenticatedUser.role === UserRole.ADMIN
    const { data } = await serialize(UserTransformer.transform(users, isAdmin))

    logger.info({ count: users.length }, 'IndexUserController completed successfully')
    response.ok({ users: data })
  }
}
