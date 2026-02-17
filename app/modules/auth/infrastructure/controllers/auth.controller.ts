import type { HttpContext } from '@adonisjs/core/http'
import { AuthUseCase } from '../../application/use_cases/auth.use_case.js'
import {
  firebaseAuthProvider,
  FirebaseHttpError,
} from '../providers/firebase_auth.provider.js'
import { localUserRepository } from '../repositories/local_user.repository.js'
import {
  disableMfaValidator,
  finalizeTotpValidator,
  listMfaEnrollmentsValidator,
  loginValidator,
  mfaLoginValidator,
  passwordResetValidator,
  registerValidator,
  startTotpValidator,
} from '../validators/auth.validators.js'

const authUseCase = new AuthUseCase(firebaseAuthProvider, localUserRepository)

export default class AuthController {
  async register({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(registerValidator)
      const authUser = await authUseCase.register(payload)

      return response.created({
        message: 'Account created successfully',
        user: {
          uid: authUser.localId,
          email: authUser.email,
        },
        tokens: {
          idToken: authUser.idToken,
          refreshToken: authUser.refreshToken,
          expiresIn: authUser.expiresIn,
        },
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async login({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(loginValidator)
      const result = await authUseCase.login(payload)

      if (result.mfaRequired) {
        return response.ok({
          mfaRequired: true,
          pendingCredential: result.pendingCredential,
          mfaInfo: result.mfaInfo,
        })
      }

      return response.ok({
        mfaRequired: false,
        user: {
          uid: result.localId,
          email: result.email,
        },
        tokens: {
          idToken: result.idToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async loginWithTotp({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(mfaLoginValidator)
      const result = await authUseCase.loginWithTotp(payload)

      return response.ok({
        mfaRequired: false,
        user: {
          uid: result.localId,
          email: result.email,
        },
        tokens: {
          idToken: result.idToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async sendPasswordReset({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(passwordResetValidator)
      await authUseCase.sendPasswordReset(payload)

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
      const result = await authUseCase.startTotpSetup(payload)

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
      const result = await authUseCase.finalizeTotpSetup(payload)

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
      const enrollments = await authUseCase.listMfaEnrollments(payload)

      return response.ok({
        enrollments,
      })
    } catch (error) {
      return this.handleError(response, error)
    }
  }

  async disableMfa({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(disableMfaValidator)
      const result = await authUseCase.disableMfa(payload)

      return response.ok({
        message: 'Two-factor authentication disabled',
        tokens: result,
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
