import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StartTotpSetupAuthUseCase } from '#auth/application/usecases/start-totp-setup-auth.use-case'
import { handleAuthError } from '#auth/infrastructure/http/auth-error-handler'
import { startTotpSetupAuthValidator } from '#auth/infrastructure/http/validators/start.totp.setup.auth.validator'

@inject()
export default class StartTotpSetupAuthController {
  constructor(private readonly useCase: StartTotpSetupAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(startTotpSetupAuthValidator)
      const result = await this.useCase.execute(payload)

      return response.ok({
        message: 'Scan the QR URI in Aegis and confirm with a generated code',
        setup: result,
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
