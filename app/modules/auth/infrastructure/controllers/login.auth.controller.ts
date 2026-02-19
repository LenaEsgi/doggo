import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LoginAuthService } from '#auth/application/contracts/login.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth_error_handler'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { loginAuthValidator } from '#auth/infrastructure/validators/login.auth.validator'

@inject()
export default class LoginAuthController {
  constructor(private readonly authService: LoginAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(loginAuthValidator)
      const result = await this.authService.login(payload)

      return response.ok(AuthSerializer.loginResult(result))
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
