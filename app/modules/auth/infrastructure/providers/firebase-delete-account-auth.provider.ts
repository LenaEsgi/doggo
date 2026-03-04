import { type DeleteAccountAuthProvider } from '#auth/domain/contracts/delete.account.auth.provider'
import type { DeleteAccountResult } from '#auth/domain/types/delete.account.result'
import {
  FirebaseAuthProviderBase,
  FirebaseHttpError,
} from '#auth/infrastructure/providers/firebase_auth.base'

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
      throw new FirebaseHttpError(
        'Unable to resolve account email before deletion',
        400,
        'ACCOUNT_EMAIL_MISSING'
      )
    }

    await this.request('v1/accounts:delete', {
      idToken,
    })

    return { email }
  }
}
