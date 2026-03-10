import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LoginWithTotpAuthUseCase } from '#auth/application/usecases/login-with-totp-auth.use-case'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { loginWithTotpAuthValidator } from '#auth/infrastructure/http/validators/login.with.totp.auth.validator'

@inject()
export default class LoginWithTotpAuthController {
  constructor(private readonly useCase: LoginWithTotpAuthUseCase) {}

  async handle({ request, response, logger }: HttpContext) {
    const payload = await request.validateUsing(loginWithTotpAuthValidator)
    logger.info({ mfaEnrollmentId: payload.mfaEnrollmentId }, 'LoginWithTotpAuthController called')
    const result = await this.useCase.execute(payload)

    logger.info(
      { mfaEnrollmentId: payload.mfaEnrollmentId },
      'LoginWithTotpAuthController completed successfully'
    )
    return response.ok(AuthSerializer.authSuccess(result))
  }
}
