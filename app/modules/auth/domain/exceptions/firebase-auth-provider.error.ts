import { HttpError } from '#app/modules/share/exceptions/http-error'
import {
  DEFAULT_FIREBASE_AUTH_ERROR,
  FIREBASE_AUTH_ERRORS,
} from '#auth/domain/exceptions/firebase-auth-errors'

export class FirebaseAuthProviderError extends HttpError {
  public readonly code: string

  constructor(rawCode: string, details?: unknown) {
    const code = rawCode.split(' ')[0].replace(':', '')
    const definition =
      FIREBASE_AUTH_ERRORS[code] ?? FIREBASE_AUTH_ERRORS[rawCode] ?? DEFAULT_FIREBASE_AUTH_ERROR
    super(definition.message, definition.status, code, details)
    this.code = code
  }
}
