import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { IndexUserUseCase } from '#users/application/usecases/index-user.use-case'
import UserTransformer from '#users/infrastructure/http/transformers/user.transformer'
import { UserRole } from '#users/domain/enums/user.role'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'

@inject()
export default class IndexUserController {
  constructor(private readonly useCase: IndexUserUseCase) {}

  async handle({
    response,
    request,
    logger,
    bouncer,
    authenticatedUser,
    serialize,
  }: HttpContext): Promise<void> {
    await bouncer.with('UserPolicy').authorize('index')

    logger.info({}, 'IndexUserController called')

    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 25)),
    }

    const { data: users, meta } = await this.useCase.execute(params)

    const isAdmin = authenticatedUser.role === UserRole.ADMIN
    const { data } = await serialize(UserTransformer.transform(users, isAdmin))

    logger.info({ count: users.length }, 'IndexUserController completed successfully')
    response.ok({ data, meta })
  }
}
