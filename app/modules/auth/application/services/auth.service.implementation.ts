import { inject } from '@adonisjs/core'
import { AuthService } from '#auth/application/contracts/auth.service'
import type { DeleteAccountDto } from '#auth/application/dto/delete_account.dto'
import type { DisableMfaDto } from '#auth/application/dto/disable_mfa.dto'
import type { FinalizeTotpSetupDto } from '#auth/application/dto/finalize_totp_setup.dto'
import type { ListMfaEnrollmentsDto } from '#auth/application/dto/list_mfa_enrollments.dto'
import type { LoginDto } from '#auth/application/dto/login.dto'
import type { LoginWithTotpDto } from '#auth/application/dto/login_with_totp.dto'
import type { PasswordResetDto } from '#auth/application/dto/password_reset.dto'
import type { RegisterDto } from '#auth/application/dto/register.dto'
import type { StartTotpSetupDto } from '#auth/application/dto/start_totp_setup.dto'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local_user.repository'
import type {
  AuthTokens,
  DisableMfaResult,
  LoginResult,
  MfaInfo,
  TotpEnrollmentStart,
  TotpFinalizeResult,
} from '#auth/domain/types/auth.types'

@inject()
export class AuthServiceImplementation extends AuthService {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly localUserRepository: LocalUserRepository
  ) {
    super()
  }

  async register(payload: RegisterDto): Promise<AuthTokens> {
    const authUser = await this.authProvider.register(payload.email, payload.password)

    await this.localUserRepository.ensureUserProfile({
      firstname: payload.firstname,
      lastname: payload.lastname,
      email: payload.email,
    })

    return authUser
  }

  async login(payload: LoginDto): Promise<LoginResult> {
    return this.authProvider.login(payload.email, payload.password)
  }

  async loginWithTotp(payload: LoginWithTotpDto): Promise<AuthTokens> {
    return this.authProvider.completeMfaLogin(
      payload.pendingCredential,
      payload.mfaEnrollmentId,
      payload.verificationCode
    )
  }

  async sendPasswordReset(payload: PasswordResetDto): Promise<void> {
    await this.authProvider.sendPasswordResetEmail(payload.email)
  }

  async startTotpSetup(payload: StartTotpSetupDto): Promise<TotpEnrollmentStart> {
    return this.authProvider.startTotpEnrollment(payload.idToken)
  }

  async finalizeTotpSetup(payload: FinalizeTotpSetupDto): Promise<TotpFinalizeResult> {
    return this.authProvider.finalizeTotpEnrollment(
      payload.idToken,
      payload.sessionInfo,
      payload.verificationCode,
      payload.displayName
    )
  }

  async listMfaEnrollments(payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]> {
    return this.authProvider.listEnrollments(payload.idToken)
  }

  async disableMfa(payload: DisableMfaDto): Promise<DisableMfaResult> {
    return this.authProvider.disableMfa(payload.idToken, payload.mfaEnrollmentId)
  }

  async deleteAccount(payload: DeleteAccountDto): Promise<void> {
    const deletedAccount = await this.authProvider.deleteAccount(payload.idToken)
    await this.localUserRepository.deleteByEmail(deletedAccount.email)
  }
}
