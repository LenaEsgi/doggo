import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DeleteAccountAuthUseCase } from '#auth/application/usecases/delete-account-auth.use-case'
import { handleAuthError } from '#auth/infrastructure/http/auth-error-handler'
import { deleteAccountAuthValidator } from '#auth/infrastructure/http/validators/delete.account.auth.validator'

@inject()
export default class DeleteAccountAuthController {
  constructor(private readonly useCase: DeleteAccountAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(deleteAccountAuthValidator)
      await this.useCase.execute(payload)

      return response.ok({
        message: 'Account deleted successfully',
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
