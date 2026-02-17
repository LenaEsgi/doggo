import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AuthService } from '#auth/application/contracts/auth.service'
import {
  FirebaseHttpError,
} from '#auth/infrastructure/providers/firebase_auth.provider'
import {
  deleteAccountValidator,
  disableMfaValidator,
  finalizeTotpValidator,
  listMfaEnrollmentsValidator,
  loginValidator,
  mfaLoginValidator,
  passwordResetValidator,
  registerValidator,
  startTotpValidator,
} from '#auth/infrastructure/validators/auth.validators'
import { AuthSerializer } from '#auth/infrastructure/serializers/auth.serializer'

@inject()
export default class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(registerValidator)
      const authUser = await this.authService.register(payload)

      return response.created(AuthSerializer.registerSuccess(authUser))
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async login({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(loginValidator)
      const result = await this.authService.login(payload)
      return response.ok(AuthSerializer.loginResult(result))
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async loginWithTotp({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(mfaLoginValidator)
      const result = await this.authService.loginWithTotp(payload)

      return response.ok(AuthSerializer.authSuccess(result))
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async sendPasswordReset({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(passwordResetValidator)
      await this.authService.sendPasswordReset(payload)

      return response.ok({
        message: 'Password reset email sent',
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async startTotpSetup({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(startTotpValidator)
      const result = await this.authService.startTotpSetup(payload)

      return response.ok({
        message: 'Scan the QR URI in Aegis and confirm with a generated code',
        setup: result,
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async finalizeTotpSetup({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(finalizeTotpValidator)
      const result = await this.authService.finalizeTotpSetup(payload)

      return response.ok({
        message: 'Two-factor authentication enabled',
        tokens: result,
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async listMfaEnrollments({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(listMfaEnrollmentsValidator)
      const enrollments = await this.authService.listMfaEnrollments(payload)

      return response.ok(AuthSerializer.mfaEnrollments(enrollments))
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async disableMfa({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(disableMfaValidator)
      const result = await this.authService.disableMfa(payload)

      return response.ok({
        message: 'Two-factor authentication disabled',
        tokens: result,
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async deleteAccount({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(deleteAccountValidator)
      await this.authService.deleteAccount(payload)

      return response.ok({
        message: 'Account deleted successfully',
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  private handleError(response: HttpContext['response'], error: unknown) {
    if (error instanceof FirebaseHttpError) {
      return response.status(error.status).send({
        error: error.code,
        message: error.message,
        details: error.details,
      })
    }

    if (error instanceof Error) {
      return response.badRequest({
        error: 'REQUEST_FAILED',
        message: error.message,
      })
    }

    return response.badRequest({
      error: 'REQUEST_FAILED',
      message: 'Unexpected error',
    })
  }
}
