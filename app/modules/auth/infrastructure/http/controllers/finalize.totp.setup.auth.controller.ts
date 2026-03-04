import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { FinalizeTotpSetupAuthService } from '#auth/application/contracts/finalize.totp.setup.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth-error-handler'
import { finalizeTotpSetupAuthValidator } from '#auth/infrastructure/http/validators/finalize.totp.setup.auth.validator'

@inject()
export default class FinalizeTotpSetupAuthController {
  constructor(private readonly authService: FinalizeTotpSetupAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(finalizeTotpSetupAuthValidator)
      const result = await this.authService.finalizeTotpSetup(payload)

      return response.ok({
        message: 'Two-factor authentication enabled',
        tokens: result,
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
