import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ListMfaEnrollmentsAuthService } from '#auth/application/contracts/list.mfa.enrollments.auth.service'
import { handleAuthError } from '#auth/infrastructure/http/auth_error_handler'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'
import { listMfaEnrollmentsAuthValidator } from '#auth/infrastructure/validators/list.mfa.enrollments.auth.validator'

@inject()
export default class ListMfaEnrollmentsAuthController {
  constructor(private readonly authService: ListMfaEnrollmentsAuthService) {}

  async handle({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(listMfaEnrollmentsAuthValidator)
      const enrollments = await this.authService.listMfaEnrollments(payload)

      return response.ok(AuthSerializer.mfaEnrollments(enrollments))
    } catch (error) {
      return handleAuthError(response, error)
    }
  }
}
