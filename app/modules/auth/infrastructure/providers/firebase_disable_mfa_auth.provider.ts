import { type DisableMfaAuthProvider } from '#auth/domain/contracts/disable.mfa.auth.provider'
import type { DisableMfaResult } from '#auth/domain/types/disable.mfa.result'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase_auth.base'

export class FirebaseDisableMfaAuthProvider
  extends FirebaseAuthProviderBase
  implements DisableMfaAuthProvider
{
  async disableMfa(idToken: string, mfaEnrollmentId: string): Promise<DisableMfaResult> {
    const payload = await this.request<DisableMfaResult>('v2/accounts/mfaEnrollment:withdraw', {
      idToken,
      mfaEnrollmentId,
    })

    return {
      idToken: payload.idToken,
      refreshToken: payload.refreshToken,
    }
  }
}
