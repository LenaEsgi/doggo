import { type LoginWithTotpAuthProvider } from '#auth/domain/contracts/login.with.totp.auth.provider'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase-auth.base'

export class FirebaseLoginWithTotpAuthProvider
  extends FirebaseAuthProviderBase
  implements LoginWithTotpAuthProvider
{
  async completeMfaLogin(
    pendingCredential: string,
    mfaEnrollmentId: string,
    verificationCode: string
  ): Promise<AuthTokens> {
    const result = await this.request<AuthTokens>('v2/accounts/mfaSignIn:finalize', {
      mfaPendingCredential: pendingCredential,
      mfaEnrollmentId,
      totpVerificationInfo: {
        verificationCode,
      },
    })

    // Firebase mfaSignIn:finalize only returns idToken + refreshToken,
    // extract localId and email from the JWT payload
    if (!result.localId || !result.email) {
      try {
        const payload = JSON.parse(
          Buffer.from(result.idToken.split('.')[1], 'base64url').toString('utf8')
        ) as { user_id?: string; sub?: string; email?: string }
        if (!result.localId) result.localId = payload.user_id || payload.sub || ''
        if (!result.email) result.email = payload.email || ''
      } catch {
        /* ignore parse errors */
      }
    }

    return result
  }
}
