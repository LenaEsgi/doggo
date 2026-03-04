import { type RegisterAuthProvider } from '#auth/domain/contracts/register.auth.provider'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'
import { FirebaseAuthProviderBase } from '#auth/infrastructure/providers/firebase-auth.base'

export class FirebaseRegisterAuthProvider
  extends FirebaseAuthProviderBase
  implements RegisterAuthProvider
{
  async register(email: string, password: string): Promise<AuthTokens> {
    return this.request<AuthTokens>('v1/accounts:signUp', {
      email,
      password,
      returnSecureToken: true,
    })
  }
}
