import type {
  AuthTokens,
  DisableMfaResult,
  LoginResult,
  MfaInfo,
  TotpEnrollmentStart,
  TotpFinalizeResult,
} from '../types/auth.types.js'

export interface AuthProvider {
  register(email: string, password: string): Promise<AuthTokens>
  login(email: string, password: string): Promise<LoginResult>
  completeMfaLogin(
    pendingCredential: string,
    mfaEnrollmentId: string,
    verificationCode: string
  ): Promise<AuthTokens>
  sendPasswordResetEmail(email: string): Promise<void>
  startTotpEnrollment(idToken: string): Promise<TotpEnrollmentStart>
  finalizeTotpEnrollment(
    idToken: string,
    sessionInfo: string,
    verificationCode: string,
    displayName?: string
  ): Promise<TotpFinalizeResult>
  listEnrollments(idToken: string): Promise<MfaInfo[]>
  disableMfa(idToken: string, mfaEnrollmentId: string): Promise<DisableMfaResult>
}
