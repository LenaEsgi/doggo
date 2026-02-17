import type { DeleteAccountDto } from '#auth/application/dto/delete_account.dto'
import type { DisableMfaDto } from '#auth/application/dto/disable_mfa.dto'
import type { FinalizeTotpSetupDto } from '#auth/application/dto/finalize_totp_setup.dto'
import type { ListMfaEnrollmentsDto } from '#auth/application/dto/list_mfa_enrollments.dto'
import type { LoginDto } from '#auth/application/dto/login.dto'
import type { LoginWithTotpDto } from '#auth/application/dto/login_with_totp.dto'
import type { PasswordResetDto } from '#auth/application/dto/password_reset.dto'
import type { RegisterDto } from '#auth/application/dto/register.dto'
import type { StartTotpSetupDto } from '#auth/application/dto/start_totp_setup.dto'
import type {
  AuthTokens,
  DisableMfaResult,
  LoginResult,
  MfaInfo,
  TotpEnrollmentStart,
  TotpFinalizeResult,
} from '#auth/domain/types/auth.types'

export abstract class AuthService {
  abstract register(payload: RegisterDto): Promise<AuthTokens>

  abstract login(payload: LoginDto): Promise<LoginResult>

  abstract loginWithTotp(payload: LoginWithTotpDto): Promise<AuthTokens>

  abstract sendPasswordReset(payload: PasswordResetDto): Promise<void>

  abstract startTotpSetup(payload: StartTotpSetupDto): Promise<TotpEnrollmentStart>

  abstract finalizeTotpSetup(payload: FinalizeTotpSetupDto): Promise<TotpFinalizeResult>

  abstract listMfaEnrollments(payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]>

  abstract disableMfa(payload: DisableMfaDto): Promise<DisableMfaResult>

  abstract deleteAccount(payload: DeleteAccountDto): Promise<void>
}
