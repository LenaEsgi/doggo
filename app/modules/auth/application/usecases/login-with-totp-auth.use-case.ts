import { inject } from '@adonisjs/core'
import { type LoginWithTotpDto } from '#auth/application/dto/login-with-totp.dto'
import { LoginWithTotpAuthProvider } from '#auth/domain/contracts/login.with.totp.auth.provider'
import { type AuthTokens } from '#auth/domain/types/auth.tokens'

@inject()
export class LoginWithTotpAuthUseCase {
  constructor(private readonly authProvider: LoginWithTotpAuthProvider) {}

  execute(payload: LoginWithTotpDto): Promise<AuthTokens> {
    return this.authProvider.completeMfaLogin(
      payload.pendingCredential,
      payload.mfaEnrollmentId,
      payload.verificationCode
    )
  }
}
