import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PasswordResetAuthUseCase } from '#auth/application/usecases/password-reset-auth.use-case'
import { passwordResetAuthValidator } from '#auth/infrastructure/http/validators/password.reset.auth.validator'

@inject()
export default class PasswordResetAuthController {
  constructor(private readonly useCase: PasswordResetAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    const payload = await request.validateUsing(passwordResetAuthValidator)
    await this.useCase.execute(payload)

    return response.ok({
      message: 'Password reset email sent',
    })
  }
}
