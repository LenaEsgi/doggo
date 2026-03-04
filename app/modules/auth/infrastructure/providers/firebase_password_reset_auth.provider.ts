import { type PasswordResetAuthProvider } from '#auth/domain/contracts/password.reset.auth.provider'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase_auth.base'

export class FirebasePasswordResetAuthProvider
  extends FirebaseAuthProviderBase
  implements PasswordResetAuthProvider
{
  async sendPasswordResetEmail(email: string): Promise<void> {
    await this.request('v1/accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
    })
  }
}
