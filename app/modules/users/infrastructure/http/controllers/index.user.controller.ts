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

    const isAdmin = authenticatedUser.role === UserRole.ADMIN
    const search: string | undefined = request.input('search')

    if (!isAdmin && (!search || search.trim().length < 3)) {
      return response.unprocessableEntity({
        message: 'search is required and must be at least 3 characters',
      })
    }

    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 25)),
      search,
    }

    const { data: users, meta } = await this.useCase.execute(params)

    const { data } = await serialize(UserTransformer.transform(users, isAdmin))

    logger.info({ count: users.length }, 'IndexUserController completed successfully')
    response.ok({ data, meta })
  }
}
