import { getAuth } from 'firebase-admin/auth'
import { type GoogleLoginAuthProvider } from '#auth/domain/contracts/google.login.auth.provider'
import type { GoogleUserInfo } from '#auth/domain/types/google.user.info'

export class FirebaseGoogleLoginAuthProvider implements GoogleLoginAuthProvider {
  async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    const decoded = await getAuth().verifyIdToken(idToken)

    const rawName = decoded.name ?? decoded.email?.split('@')[0] ?? 'User'
    const parts = rawName.trim().split(' ')
    const firstname = parts[0]
    const lastname = parts.length > 1 ? parts.slice(1).join(' ') : parts[0]

    return {
      uid: decoded.uid,
      email: decoded.email ?? '',
      firstname,
      lastname,
    }
  }
}
