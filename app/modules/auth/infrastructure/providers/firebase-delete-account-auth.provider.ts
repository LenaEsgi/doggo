import { type DeleteAccountAuthProvider } from '#auth/domain/contracts/delete.account.auth.provider'
import type { DeleteAccountResult } from '#auth/domain/types/delete.account.result'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase-auth.base'
import { FirebaseAuthProviderError } from '#auth/domain/exceptions/firebase-auth-provider.error'

export class FirebaseDeleteAccountAuthProvider
  extends FirebaseAuthProviderBase
  implements DeleteAccountAuthProvider
{
  async deleteAccount(idToken: string): Promise<DeleteAccountResult> {
    const lookup = await this.request<{ users?: Array<{ email?: string }> }>('v1/accounts:lookup', {
      idToken,
    })

    const email = lookup.users?.[0]?.email
    if (!email) {
      throw new FirebaseAuthProviderError('ACCOUNT_EMAIL_MISSING')
    }

    await this.request('v1/accounts:delete', {
      idToken,
    })

    return { email }
  }
}
