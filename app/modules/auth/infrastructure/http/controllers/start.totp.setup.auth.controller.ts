import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StartTotpSetupAuthService } from '#auth/application/contracts/start.totp.setup.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth-error-handler'
import { startTotpSetupAuthValidator } from '#auth/infrastructure/http/validators/start.totp.setup.auth.validator'

@inject()
export default class StartTotpSetupAuthController {
  constructor(private readonly authService: StartTotpSetupAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(startTotpSetupAuthValidator)
      const result = await this.authService.startTotpSetup(payload)

      return response.ok({
        message: 'Scan the QR URI in Aegis and confirm with a generated code',
        setup: result,
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
