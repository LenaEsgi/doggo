import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PasswordResetAuthService } from '#auth/application/contracts/password.reset.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth_error_handler'
import { passwordResetAuthValidator } from '#auth/infrastructure/validators/password.reset.auth.validator'

@inject()
export default class PasswordResetAuthController {
  constructor(private readonly authService: PasswordResetAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(passwordResetAuthValidator)
      await this.authService.sendPasswordReset(payload)

      return response.ok({
        message: 'Password reset email sent',
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
