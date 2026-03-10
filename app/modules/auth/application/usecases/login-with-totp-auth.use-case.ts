import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type LoginWithTotpDto } from '#auth/application/dto/login-with-totp.dto'
import { LoginWithTotpAuthProvider } from '#auth/domain/contracts/login.with.totp.auth.provider'
import { type AuthTokens } from '#auth/domain/types/auth.tokens'

@inject()
export class LoginWithTotpAuthUseCase {
  constructor(private readonly authProvider: LoginWithTotpAuthProvider) {}

  async execute(payload: LoginWithTotpDto): Promise<AuthTokens> {
    logger.info({ mfaEnrollmentId: payload.mfaEnrollmentId }, 'LoginWithTotpAuthUseCase started')
    const result = await this.authProvider.completeMfaLogin(
      payload.pendingCredential,
      payload.mfaEnrollmentId,
      payload.verificationCode
    )
    logger.info(
      { mfaEnrollmentId: payload.mfaEnrollmentId },
      'LoginWithTotpAuthUseCase completed successfully'
    )
    return result
  }
}
