import { type LoginAuthProvider } from '#auth/domain/contracts/login.auth.provider'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'
import type { LoginResult } from '#auth/domain/types/login.result'
import type { MfaInfo } from '#auth/domain/types/mfa.info'
import {
  FirebaseAuthProviderBase,
  FirebaseHttpError,
} from '#auth/infrastructure/providers/firebase_auth.base'

export class FirebaseLoginAuthProvider
  extends FirebaseAuthProviderBase
  implements LoginAuthProvider
{
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const payload = await this.request<AuthTokens>('v1/accounts:signInWithPassword', {
        email,
        password,
        returnSecureToken: true,
      })

      return {
        mfaRequired: false,
        ...payload,
      }
    } catch (error) {
      if (error instanceof FirebaseHttpError && error.code === 'MFA_REQUIRED' && error.details) {
        const details = error.details as Record<string, unknown>
        const mfaInfo = ((details.mfaInfo ?? []) as MfaInfo[]) || []

        return {
          mfaRequired: true,
          pendingCredential: String(details.mfaPendingCredential ?? ''),
          mfaInfo,
        }
      }

      throw error
    }
  }
}
