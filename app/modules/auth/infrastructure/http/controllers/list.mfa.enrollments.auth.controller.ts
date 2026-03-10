import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListMfaEnrollmentsAuthUseCase } from '#auth/application/usecases/list-mfa-enrollments-auth.use-case'
import { handleAuthError } from '#auth/infrastructure/http/auth-error-handler'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { listMfaEnrollmentsAuthValidator } from '#auth/infrastructure/http/validators/list.mfa.enrollments.auth.validator'

@inject()
export default class ListMfaEnrollmentsAuthController {
  constructor(private readonly useCase: ListMfaEnrollmentsAuthUseCase) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(listMfaEnrollmentsAuthValidator)
      const enrollments = await this.useCase.execute(payload)

      return response.ok(AuthSerializer.mfaEnrollments(enrollments))
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
