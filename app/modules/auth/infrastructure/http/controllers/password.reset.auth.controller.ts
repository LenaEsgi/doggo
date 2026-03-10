import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PasswordResetAuthUseCase } from '#auth/application/usecases/password-reset-auth.use-case'
import { passwordResetAuthValidator } from '#auth/infrastructure/http/validators/password.reset.auth.validator'

@inject()
export default class PasswordResetAuthController {
  constructor(private readonly useCase: PasswordResetAuthUseCase) {}

  async handle({ request, response, logger }: HttpContext) {
    const payload = await request.validateUsing(passwordResetAuthValidator)
    logger.info({ email: payload.email }, 'PasswordResetAuthController called')
    await this.useCase.execute(payload)

    logger.info({ email: payload.email }, 'PasswordResetAuthController completed successfully')
    return response.ok({
      message: 'Password reset email sent',
    })
  }
}
