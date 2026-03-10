import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LoginAuthUseCase } from '#auth/application/usecases/login-auth.use-case'
import { handleAuthError } from '#auth/infrastructure/http/auth-error-handler'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { loginAuthValidator } from '#auth/infrastructure/http/validators/login.auth.validator'

@inject()
export default class LoginAuthController {
  constructor(private readonly useCase: LoginAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(loginAuthValidator)
      const result = await this.useCase.execute(payload)

      return response.ok(AuthSerializer.loginResult(result))
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
