import type { SendEmailVerificationAuthProvider } from '#auth/domain/contracts/send.email.verification.auth.provider'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase-auth.base'

export class FirebaseSendEmailVerificationAuthProvider
  extends FirebaseAuthProviderBase
  implements SendEmailVerificationAuthProvider
{
  async sendEmailVerification(idToken: string): Promise<void> {
    await this.request<unknown>('v1/accounts:sendOobCode', {
      requestType: 'VERIFY_EMAIL',
      idToken,
    })
  }
}
