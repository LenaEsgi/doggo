import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LoginWithTotpAuthService } from '#auth/application/contracts/login.with.totp.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth-error-handler'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { loginWithTotpAuthValidator } from '#auth/infrastructure/http/validators/login.with.totp.auth.validator'

@inject()
export default class LoginWithTotpAuthController {
  constructor(private readonly authService: LoginWithTotpAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(loginWithTotpAuthValidator)
      const result = await this.authService.loginWithTotp(payload)

      return response.ok(AuthSerializer.authSuccess(result))
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
