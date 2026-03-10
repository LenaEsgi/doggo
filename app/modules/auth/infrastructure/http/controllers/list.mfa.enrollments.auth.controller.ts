import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListMfaEnrollmentsAuthUseCase } from '#auth/application/usecases/list-mfa-enrollments-auth.use-case'
import { extractBearerToken } from '#auth/infrastructure/http/helpers/extract-bearer-token'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'

@inject()
export default class ListMfaEnrollmentsAuthController {
  constructor(private readonly useCase: ListMfaEnrollmentsAuthUseCase) {}

  async handle({ request, response, logger }: HttpContext) {
    logger.info({}, 'ListMfaEnrollmentsAuthController called')
    const payload = { idToken: extractBearerToken(request) }
    const enrollments = await this.useCase.execute(payload)

    logger.info(
      { count: enrollments.length },
      'ListMfaEnrollmentsAuthController completed successfully'
    )
    return response.ok(AuthSerializer.mfaEnrollments(enrollments))
  }
}
