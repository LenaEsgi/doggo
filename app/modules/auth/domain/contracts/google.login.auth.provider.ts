export type GoogleUserInfo = {
  uid: string
  email: string
  firstname: string
  lastname: string
}

export abstract class GoogleLoginAuthProvider {
  abstract verifyGoogleToken(idToken: string): Promise<GoogleUserInfo>
}
