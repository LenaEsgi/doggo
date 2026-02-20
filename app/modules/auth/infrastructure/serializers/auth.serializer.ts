import type { AuthTokens, LoginResult, MfaInfo } from '#auth/domain/types/auth.types'

export class AuthSerializer {
  static authSuccess(tokens: AuthTokens) {
    return {
      mfaRequired: false,
      user: {
        uid: tokens.localId,
        email: tokens.email,
      },
      tokens: {
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    }
  }

  static registerSuccess(tokens: AuthTokens) {
    return {
      message: 'Account created successfully',
      ...this.authSuccess(tokens),
    }
  }

  static loginResult(result: LoginResult) {
    if (result.mfaRequired) {
      return {
        mfaRequired: true,
        pendingCredential: result.pendingCredential,
        mfaInfo: result.mfaInfo,
      }
    }

    return this.authSuccess(result)
  }

  static mfaEnrollments(enrollments: MfaInfo[]) {
    return { enrollments }
  }
}
