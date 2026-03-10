import { HttpError } from '#app/modules/share/exceptions/http-error'
import {
  DEFAULT_FIREBASE_AUTH_ERROR,
  FIREBASE_AUTH_ERRORS,
} from '#auth/domain/exceptions/firebase-auth-errors'

export class FirebaseAuthProviderError extends HttpError {
  constructor(
    public readonly code: string,
    details?: unknown
  ) {
    const definition = FIREBASE_AUTH_ERRORS[code] ?? DEFAULT_FIREBASE_AUTH_ERROR
    super(definition.message, definition.status, code, details)
  }
}
