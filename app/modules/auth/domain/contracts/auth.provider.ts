import type {
  AuthTokens,
  DeleteAccountResult,
  DisableMfaResult,
  LoginResult,
  MfaInfo,
  TotpEnrollmentStart,
  TotpFinalizeResult,
} from '#auth/domain/types/auth.types'

export abstract class AuthProvider {
  abstract register(email: string, password: string): Promise<AuthTokens>
  abstract login(email: string, password: string): Promise<LoginResult>
  abstract completeMfaLogin(
    pendingCredential: string,
    mfaEnrollmentId: string,
    verificationCode: string
  ): Promise<AuthTokens>
  abstract sendPasswordResetEmail(email: string): Promise<void>
  abstract startTotpEnrollment(idToken: string): Promise<TotpEnrollmentStart>
  abstract finalizeTotpEnrollment(
    idToken: string,
    sessionInfo: string,
    verificationCode: string,
    displayName?: string
  ): Promise<TotpFinalizeResult>
  abstract deleteAccount(idToken: string): Promise<DeleteAccountResult>
  abstract listEnrollments(idToken: string): Promise<MfaInfo[]>
  abstract disableMfa(idToken: string, mfaEnrollmentId: string): Promise<DisableMfaResult>
}
