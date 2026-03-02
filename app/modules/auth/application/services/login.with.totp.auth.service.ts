import { inject } from '@adonisjs/core'
import { LoginWithTotpAuthService } from '#auth/application/contracts/login.with.totp.auth.service'
import type { LoginWithTotpDto } from '#auth/application/dto/login_with_totp.dto'
import { LoginWithTotpAuthProvider } from '#auth/domain/contracts/login.with.totp.auth.provider'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'

@inject()
export class LoginWithTotpAuth implements LoginWithTotpAuthService {
  constructor(private readonly authProvider: LoginWithTotpAuthProvider) {}

  loginWithTotp(payload: LoginWithTotpDto): Promise<AuthTokens> {
    return this.authProvider.completeMfaLogin(
      payload.pendingCredential,
      payload.mfaEnrollmentId,
      payload.verificationCode
    )
  }
}
