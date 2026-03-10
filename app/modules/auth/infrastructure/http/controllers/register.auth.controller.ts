import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { RegisterAuthUseCase } from '#auth/application/usecases/register-auth.use-case'
import { handleAuthError } from '#auth/infrastructure/http/auth-error-handler'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { registerAuthValidator } from '#auth/infrastructure/http/validators/register.auth.validator'

@inject()
export default class RegisterAuthController {
  constructor(private readonly useCase: RegisterAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(registerAuthValidator)
      const authUser = await this.useCase.execute(payload)

      return response.created(AuthSerializer.registerSuccess(authUser))
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
