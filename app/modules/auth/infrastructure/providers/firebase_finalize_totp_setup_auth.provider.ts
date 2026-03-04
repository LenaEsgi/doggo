import { type FinalizeTotpSetupAuthProvider } from '#auth/domain/contracts/finalize.totp.setup.auth.provider'
import type { TotpFinalizeResult } from '#auth/domain/types/totp.finalize.result'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase_auth.base'

export class FirebaseFinalizeTotpSetupAuthProvider
  extends FirebaseAuthProviderBase
  implements FinalizeTotpSetupAuthProvider
{
  async finalizeTotpEnrollment(
    idToken: string,
    sessionInfo: string,
    verificationCode: string,
    displayName?: string
  ): Promise<TotpFinalizeResult> {
    const result = await this.request<{
      idToken: string
      refreshToken: string
      mfaInfo?: Array<{ mfaEnrollmentId?: string }>
    }>('v2/accounts/mfaEnrollment:finalize', {
      idToken,
      displayName,
      totpVerificationInfo: {
        sessionInfo,
        verificationCode,
      },
    })

    return {
      idToken: result.idToken,
      refreshToken: result.refreshToken,
      mfaEnrollmentId: result.mfaInfo?.[0]?.mfaEnrollmentId,
    }
  }
}
