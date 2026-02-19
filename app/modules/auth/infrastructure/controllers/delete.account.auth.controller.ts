import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DeleteAccountAuthService } from '#auth/application/contracts/delete.account.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth_error_handler'
import { deleteAccountAuthValidator } from '#auth/infrastructure/validators/delete.account.auth.validator'

@inject()
export default class DeleteAccountAuthController {
  constructor(private readonly authService: DeleteAccountAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(deleteAccountAuthValidator)
      await this.authService.deleteAccount(payload)

      return response.ok({
        message: 'Account deleted successfully',
      })
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
