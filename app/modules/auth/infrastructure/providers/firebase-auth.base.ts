import env from '#start/env'

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

export abstract class FirebaseAuthProviderBase {
  protected readonly apiKey = env.get('FIREBASE_API_KEY')
  protected readonly projectId = env.get('FIREBASE_PROJECT_ID')
  protected readonly issuer = env.get('FIREBASE_TOTP_ISSUER')

  protected get issuerName() {
    return this.issuer || this.projectId || 'Doggo'
  }

  protected tryExtractEmailFromIdToken(idToken: string): string | null {
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

  protected async request<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
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
