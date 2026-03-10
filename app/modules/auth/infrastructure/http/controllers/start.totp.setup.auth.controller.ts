import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StartTotpSetupAuthUseCase } from '#auth/application/usecases/start-totp-setup-auth.use-case'
import { extractBearerToken } from '#auth/infrastructure/http/helpers/extract-bearer-token'
import { handleAuthError } from '#auth/infrastructure/http/errors/auth-error-handler'

@inject()
export default class StartTotpSetupAuthController {
  constructor(private readonly useCase: StartTotpSetupAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = { idToken: extractBearerToken(request) }
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
