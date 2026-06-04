import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { UpdateUserUseCase } from '#users/application/usecases/update-user.use-case'
import UserTransformer from '#users/infrastructure/http/transformers/user.transformer'
import {
  updateUserParamValidator,
  updateUserValidator,
} from '#users/infrastructure/http/validators/update.user.validator'

@inject()
export default class UpdateUserController {
  constructor(private readonly useCase: UpdateUserUseCase) {}

  async handle({ request, response, logger, bouncer, serialize }: HttpContext): Promise<void> {
    const { id } = await request.validateUsing(updateUserParamValidator, {
      data: request.params(),
    })

    await bouncer.with('UserPolicy').authorize('update', id)

    const payload = await request.validateUsing(updateUserValidator)

    if (payload.role || payload.firebaseUid) {
      await bouncer.with('UserPolicy').authorize('updateRole')
    }

    logger.info({ userId: id }, 'UpdateUserController called')
    const user = await this.useCase.execute(id, payload)

    const { data } = await serialize(UserTransformer.transform(user, true))

    logger.info({ userId: id }, 'UpdateUserController completed successfully')
    response.ok({
      message: 'User updated successfully',
      user: data,
    })
  }
}
