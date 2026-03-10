import env from '#start/env'
import { FirebaseAuthProviderError } from '#auth/domain/exceptions/firebase-auth-provider.error'
import type { FirebaseErrorBody } from '#auth/domain/types/firebase-error-body'

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

      throw new FirebaseAuthProviderError(firebaseCode, details)
    }

    return (await response.json()) as T
  }
}
