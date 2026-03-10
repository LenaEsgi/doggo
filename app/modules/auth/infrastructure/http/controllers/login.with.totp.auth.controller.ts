import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LoginWithTotpAuthUseCase } from '#auth/application/usecases/login-with-totp-auth.use-case'
import { handleAuthError } from '#auth/infrastructure/http/errors/auth-error-handler'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { loginWithTotpAuthValidator } from '#auth/infrastructure/http/validators/login.with.totp.auth.validator'

@inject()
export default class LoginWithTotpAuthController {
  constructor(private readonly useCase: LoginWithTotpAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(loginWithTotpAuthValidator)
      const result = await this.useCase.execute(payload)

      return response.ok(AuthSerializer.authSuccess(result))
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
