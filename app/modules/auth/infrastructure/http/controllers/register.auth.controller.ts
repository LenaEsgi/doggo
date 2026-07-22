import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { RegisterAuthUseCase } from '#auth/application/usecases/register-auth.use-case'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { registerAuthValidator } from '#auth/infrastructure/http/validators/register.auth.validator'
import { maskEmail } from '#app/modules/share/utils/mask-email'

@inject()
export default class RegisterAuthController {
  constructor(private readonly useCase: RegisterAuthUseCase) {}

  async handle({ request, response, logger }: HttpContext) {
    const payload = await request.validateUsing(registerAuthValidator)
    logger.info({ email: maskEmail(payload.email) }, 'RegisterAuthController called')
    const authUser = await this.useCase.execute(payload)

    logger.info(
      { email: maskEmail(payload.email) },
      'RegisterAuthController completed successfully'
    )
    return response.created(AuthSerializer.registerSuccess(authUser))
  }
}
