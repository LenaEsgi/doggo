import { type ListMfaEnrollmentsAuthProvider } from '#auth/domain/contracts/list.mfa.enrollments.auth.provider'
import type { MfaInfo } from '#auth/domain/types/mfa.info'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase-auth.base'

export class FirebaseListMfaEnrollmentsAuthProvider
  extends FirebaseAuthProviderBase
  implements ListMfaEnrollmentsAuthProvider
{
  async listEnrollments(idToken: string): Promise<MfaInfo[]> {
    const payload = await this.request<{ users?: Array<{ mfaInfo?: MfaInfo[] }> }>(
      'v1/accounts:lookup',
      {
        idToken,
      }
    )

    return payload.users?.[0]?.mfaInfo ?? []
  }
}
