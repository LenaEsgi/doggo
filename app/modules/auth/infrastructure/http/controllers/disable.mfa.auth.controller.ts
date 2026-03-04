import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DisableMfaAuthService } from '#auth/application/contracts/disable.mfa.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth_error_handler'
import { disableMfaAuthValidator } from '#auth/infrastructure/http/validators/disable.mfa.auth.validator'

@inject()
export default class DisableMfaAuthController {
  constructor(private readonly authService: DisableMfaAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(disableMfaAuthValidator)
      const result = await this.authService.disableMfa(payload)

      return response.ok({
        message: 'Two-factor authentication disabled',
        tokens: result,
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
