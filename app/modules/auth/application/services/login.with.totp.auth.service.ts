import { inject } from '@adonisjs/core'
import { LoginWithTotpAuthService } from '#auth/application/contracts/login.with.totp.auth.service'
import type { LoginWithTotpDto } from '#auth/application/dto/login_with_totp.dto'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import type { AuthTokens } from '#auth/domain/types/auth.types'

@inject()
export class LoginWithTotpAuth implements LoginWithTotpAuthService {
  constructor(private readonly authProvider: AuthProvider) {}

  loginWithTotp(payload: LoginWithTotpDto): Promise<AuthTokens> {
    return this.authProvider.completeMfaLogin(
      payload.pendingCredential,
      payload.mfaEnrollmentId,
      payload.verificationCode
    )
  }
}
