import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DeleteAccountAuthUseCase } from '#auth/application/usecases/delete-account-auth.use-case'
import { extractBearerToken } from '#auth/infrastructure/http/helpers/extract-bearer-token'
import { handleAuthError } from '#auth/infrastructure/http/errors/auth-error-handler'

@inject()
export default class DeleteAccountAuthController {
  constructor(private readonly useCase: DeleteAccountAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = { idToken: extractBearerToken(request) }
      await this.useCase.execute(payload)

      return response.ok({
        message: 'Account deleted successfully',
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
