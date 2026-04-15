import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { GoogleLoginAuthUseCase } from '#auth/application/usecases/google-login-auth.use-case'
import { googleLoginAuthValidator } from '#auth/infrastructure/http/validators/google.login.auth.validator'

@inject()
export default class GoogleLoginAuthController {
  constructor(private readonly useCase: GoogleLoginAuthUseCase) {}

  async handle({ request, response, logger }: HttpContext) {
    const payload = await request.validateUsing(googleLoginAuthValidator)
    logger.info('GoogleLoginAuthController called')
    const userInfo = await this.useCase.execute(payload)

    logger.info({ uid: userInfo.uid }, 'GoogleLoginAuthController completed successfully')
    return response.ok({
      user: {
        uid: userInfo.uid,
        email: userInfo.email,
      },
    })
  }
}
