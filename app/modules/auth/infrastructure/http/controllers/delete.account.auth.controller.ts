import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DeleteAccountAuthUseCase } from '#auth/application/usecases/delete-account-auth.use-case'
import { extractBearerToken } from '#auth/infrastructure/http/helpers/extract-bearer-token'

@inject()
export default class DeleteAccountAuthController {
  constructor(private readonly useCase: DeleteAccountAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    const payload = { idToken: extractBearerToken(request) }
    await this.useCase.execute(payload)

    return response.ok({
      message: 'Account deleted successfully',
    })
  }
}
