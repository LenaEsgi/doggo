import { type LoginWithTotpAuthProvider } from '#auth/domain/contracts/login.with.totp.auth.provider'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase-auth.base'
import { FirebaseAuthProviderError } from '#auth/domain/exceptions/firebase-auth-provider.error'

export class FirebaseLoginWithTotpAuthProvider
  extends FirebaseAuthProviderBase
  implements LoginWithTotpAuthProvider
{
  async completeMfaLogin(
    pendingCredential: string,
    mfaEnrollmentId: string,
    verificationCode: string
  ): Promise<AuthTokens> {
    const start = await this.request<{ totpSessionInfo?: { sessionInfo: string } }>(
      'v2/accounts/mfaSignIn:start',
      {
        mfaPendingCredential: pendingCredential,
        mfaEnrollmentId,
        totpVerificationInfo: {},
      }
    )

    const sessionInfo = start.totpSessionInfo?.sessionInfo

    if (!sessionInfo) {
      throw new FirebaseAuthProviderError('MFA_SESSION_MISSING')
    }

    return this.request<AuthTokens>('v2/accounts/mfaSignIn:finalize', {
      mfaPendingCredential: pendingCredential,
      totpVerificationInfo: {
        sessionInfo,
        verificationCode,
      },
    })
  }
}
