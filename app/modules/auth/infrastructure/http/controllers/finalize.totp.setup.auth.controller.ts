import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { FinalizeTotpSetupAuthUseCase } from '#auth/application/usecases/finalize-totp-setup-auth.use-case'
import { extractBearerToken } from '#auth/infrastructure/http/helpers/extract-bearer-token'
import { finalizeTotpSetupAuthValidator } from '#auth/infrastructure/http/validators/finalize.totp.setup.auth.validator'

@inject()
export default class FinalizeTotpSetupAuthController {
  constructor(private readonly useCase: FinalizeTotpSetupAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    const body = await request.validateUsing(finalizeTotpSetupAuthValidator)
    const payload = { ...body, idToken: extractBearerToken(request) }
    const result = await this.useCase.execute(payload)

    return response.ok({
      message: 'Two-factor authentication enabled',
      tokens: result,
    })
  }
}
