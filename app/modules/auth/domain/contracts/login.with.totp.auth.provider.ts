import type { AuthTokens } from '#auth/domain/types/auth.tokens'

export abstract class LoginWithTotpAuthProvider {
  abstract completeMfaLogin(
    pendingCredential: string,
    mfaEnrollmentId: string,
    verificationCode: string
  ): Promise<AuthTokens>
}
