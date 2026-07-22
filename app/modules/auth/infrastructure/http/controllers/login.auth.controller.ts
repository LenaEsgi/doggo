import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LoginAuthUseCase } from '#auth/application/usecases/login-auth.use-case'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { loginAuthValidator } from '#auth/infrastructure/http/validators/login.auth.validator'
import { maskEmail } from '#app/modules/share/utils/mask-email'

@inject()
export default class LoginAuthController {
  constructor(private readonly useCase: LoginAuthUseCase) {}

  async handle({ request, response, logger }: HttpContext) {
    const payload = await request.validateUsing(loginAuthValidator)
    logger.info({ email: maskEmail(payload.email) }, 'LoginAuthController called')
    const result = await this.useCase.execute(payload)

    logger.info({ email: maskEmail(payload.email) }, 'LoginAuthController completed successfully')
    return response.ok(AuthSerializer.loginResult(result))
  }
}
