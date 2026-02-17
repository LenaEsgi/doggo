import env from '#start/env'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import type {
  AuthTokens,
  DeleteAccountResult,
  DisableMfaResult,
  LoginResult,
  MfaInfo,
  TotpEnrollmentStart,
  TotpFinalizeResult,
} from '#auth/domain/types/auth.types'

type FirebaseErrorBody = {
  error?: {
    message?: string
    details?: Array<Record<string, unknown>>
  }
}

export class FirebaseHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message)
  }
}

export class FirebaseAuthProvider extends AuthProvider {
  private readonly apiKey = env.get('FIREBASE_API_KEY')
  private readonly projectId = env.get('FIREBASE_PROJECT_ID')
  private readonly issuer = env.get('FIREBASE_TOTP_ISSUER')

  private get issuerName() {
    return this.issuer || this.projectId || 'Doggo'
  }

  async register(email: string, password: string): Promise<AuthTokens> {
    return this.request<AuthTokens>('v1/accounts:signUp', {
      email,
      password,
      returnSecureToken: true,
    })
  }

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

  async completeMfaLogin(
    pendingCredential: string,
    mfaEnrollmentId: string,
    verificationCode: string
  ): Promise<AuthTokens> {
    const start = await this.request<{ totpSessionInfo?: { sessionInfo: string } }>(
      'v2/accounts/mfaSignIn:start',
      {
        mfaPendingCredential: pendingCredential,
        mfaEnrollmentId,
        totpVerificationInfo: {},
      }
    )

    const sessionInfo = start.totpSessionInfo?.sessionInfo

    if (!sessionInfo) {
      throw new FirebaseHttpError(
        'Firebase did not return MFA session information',
        502,
        'MFA_SESSION_MISSING'
      )
    }

    return this.request<AuthTokens>('v2/accounts/mfaSignIn:finalize', {
      mfaPendingCredential: pendingCredential,
      totpVerificationInfo: {
        sessionInfo,
        verificationCode,
      },
    })
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await this.request('v1/accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
    })
  }

  async startTotpEnrollment(idToken: string): Promise<TotpEnrollmentStart> {
    const payload = await this.request<{
      totpSessionInfo?: {
        sessionInfo: string
        sharedSecretKey: string
        verificationCodeLength: number
        hashingAlgorithm: string
        periodSec: number
      }
    }>('v2/accounts/mfaEnrollment:start', {
      idToken,
      totpEnrollmentInfo: {},
    })

    const info = payload.totpSessionInfo

    if (!info?.sessionInfo || !info.sharedSecretKey) {
      throw new FirebaseHttpError(
        'Firebase did not return TOTP enrollment details',
        502,
        'TOTP_SETUP_INVALID'
      )
    }

    const email = this.tryExtractEmailFromIdToken(idToken)
    const label = email || 'user'
    const issuer = encodeURIComponent(this.issuerName)
    const secret = encodeURIComponent(info.sharedSecretKey)
    const account = encodeURIComponent(`${this.issuerName}:${label}`)
    const otpauthUri = `otpauth://totp/${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${info.verificationCodeLength}&period=${info.periodSec}`

    return {
      sessionInfo: info.sessionInfo,
      sharedSecret: info.sharedSecretKey,
      verificationCodeLength: info.verificationCodeLength,
      hashingAlgorithm: info.hashingAlgorithm,
      periodSec: info.periodSec,
      otpauthUri,
    }
  }

  async finalizeTotpEnrollment(
    idToken: string,
    sessionInfo: string,
    verificationCode: string,
    displayName?: string
  ): Promise<TotpFinalizeResult> {
    const result = await this.request<{
      idToken: string
      refreshToken: string
      mfaInfo?: MfaInfo[]
    }>('v2/accounts/mfaEnrollment:finalize', {
      idToken,
      displayName,
      totpVerificationInfo: {
        sessionInfo,
        verificationCode,
      },
    })

    return {
      idToken: result.idToken,
      refreshToken: result.refreshToken,
      mfaEnrollmentId: result.mfaInfo?.[0]?.mfaEnrollmentId,
    }
  }

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

  async listEnrollments(idToken: string): Promise<MfaInfo[]> {
    const payload = await this.request<{ users?: Array<{ mfaInfo?: MfaInfo[] }> }>(
      'v1/accounts:lookup',
      {
        idToken,
      }
    )

    return payload.users?.[0]?.mfaInfo ?? []
  }

  async disableMfa(idToken: string, mfaEnrollmentId: string): Promise<DisableMfaResult> {
    const payload = await this.request<DisableMfaResult>('v2/accounts/mfaEnrollment:withdraw', {
      idToken,
      mfaEnrollmentId,
    })

    return {
      idToken: payload.idToken,
      refreshToken: payload.refreshToken,
    }
  }

  private tryExtractEmailFromIdToken(idToken: string): string | null {
    try {
      const parts = idToken.split('.')
      if (parts.length !== 3) {
        return null
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
        email?: string
      }

      return payload.email || null
    } catch {
      return null
    }
  }

  private async request<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/${path}?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as FirebaseErrorBody
      const firebaseCode = errorBody.error?.message || 'FIREBASE_REQUEST_FAILED'
      const details = Array.isArray(errorBody.error?.details)
        ? (errorBody.error?.details?.[0] as Record<string, unknown>)
        : undefined

      throw new FirebaseHttpError(
        this.messageFromCode(firebaseCode),
        this.statusFromCode(firebaseCode),
        firebaseCode,
        details
      )
    }

    return (await response.json()) as T
  }

  private statusFromCode(code: string): number {
    const map: Record<string, number> = {
      EMAIL_EXISTS: 409,
      EMAIL_NOT_FOUND: 404,
      INVALID_PASSWORD: 401,
      USER_DISABLED: 403,
      INVALID_ID_TOKEN: 401,
      TOKEN_EXPIRED: 401,
      MFA_REQUIRED: 401,
      INVALID_VERIFICATION_CODE: 401,
      INVALID_SESSION_INFO: 400,
      INVALID_MFA_PENDING_CREDENTIAL: 401,
      TOO_MANY_ATTEMPTS_TRY_LATER: 429,
      OPERATION_NOT_ALLOWED: 403,
      WEAK_PASSWORD: 400,
      INVALID_EMAIL: 400,
    }

    return map[code] ?? 400
  }

  private messageFromCode(code: string): string {
    const map: Record<string, string> = {
      EMAIL_EXISTS: 'An account with this email already exists',
      EMAIL_NOT_FOUND: 'No account found with this email',
      INVALID_PASSWORD: 'Invalid credentials',
      USER_DISABLED: 'This account is disabled',
      INVALID_ID_TOKEN: 'Invalid authentication token',
      TOKEN_EXPIRED: 'Authentication token expired',
      MFA_REQUIRED: 'Two-factor authentication is required',
      INVALID_VERIFICATION_CODE: 'Invalid verification code',
      INVALID_SESSION_INFO: 'Invalid MFA session information',
      INVALID_MFA_PENDING_CREDENTIAL: 'Invalid pending MFA credential',
      TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts, please retry later',
      OPERATION_NOT_ALLOWED: 'This operation is not enabled in Firebase',
      WEAK_PASSWORD: 'Password is too weak',
      INVALID_EMAIL: 'Invalid email address',
    }

    return map[code] ?? 'Firebase authentication request failed'
  }
}
