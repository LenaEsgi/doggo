import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DisableMfaAuthUseCase } from '#auth/application/usecases/disable-mfa-auth.use-case'
import { extractBearerToken } from '#auth/infrastructure/http/helpers/extract-bearer-token'
import { handleAuthError } from '#auth/infrastructure/http/errors/auth-error-handler'
import { disableMfaAuthValidator } from '#auth/infrastructure/http/validators/disable.mfa.auth.validator'

@inject()
export default class DisableMfaAuthController {
  constructor(private readonly useCase: DisableMfaAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const body = await request.validateUsing(disableMfaAuthValidator)
      const payload = { ...body, idToken: extractBearerToken(request) }
      const result = await this.useCase.execute(payload)

      return response.ok({
        message: 'Two-factor authentication disabled',
        tokens: result,
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
