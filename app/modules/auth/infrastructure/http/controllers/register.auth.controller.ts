import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { RegisterAuthService } from '#auth/application/contracts/register.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth_error_handler'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { registerAuthValidator } from '#auth/infrastructure/http/validators/register.auth.validator'


@inject()
export default class RegisterAuthController {
  constructor(private readonly authService: RegisterAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(registerAuthValidator)
      const authUser = await this.authService.register(payload)

      return response.created(AuthSerializer.registerSuccess(authUser))
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
