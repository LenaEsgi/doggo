import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { SendEmailVerificationAuthUseCase } from '#auth/application/usecases/send-email-verification-auth.use-case'

@inject()
export default class SendEmailVerificationAuthController {
  constructor(private readonly useCase: SendEmailVerificationAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    const { idToken } = request.only(['idToken']) as { idToken: string }

    if (!idToken) {
      return response.badRequest({ message: 'idToken is required' })
    }

    await this.useCase.execute({ idToken })

    return response.ok({ message: 'Verification email sent' })
  }
}
