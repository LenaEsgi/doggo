import type { GoogleUserInfo } from '#auth/domain/types/google.user.info'

export abstract class GoogleLoginAuthProvider {
  abstract verifyGoogleToken(idToken: string): Promise<GoogleUserInfo>
}
