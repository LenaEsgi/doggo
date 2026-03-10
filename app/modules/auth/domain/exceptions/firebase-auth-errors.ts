import type { FirebaseHttpErrorDefinition } from '#auth/domain/types/firebase-http-error-definition'

export const DEFAULT_FIREBASE_AUTH_ERROR: FirebaseHttpErrorDefinition = {
  status: 400,
  message: 'Firebase authentication request failed',
}

export const FIREBASE_AUTH_ERRORS: Record<string, FirebaseHttpErrorDefinition> = {
  EMAIL_EXISTS: { status: 409, message: 'An account with this email already exists' },
  EMAIL_NOT_FOUND: { status: 404, message: 'No account found with this email' },
  INVALID_PASSWORD: { status: 401, message: 'Invalid credentials' },
  USER_DISABLED: { status: 403, message: 'This account is disabled' },
  INVALID_ID_TOKEN: { status: 401, message: 'Invalid authentication token' },
  TOKEN_EXPIRED: { status: 401, message: 'Authentication token expired' },
  MFA_REQUIRED: { status: 401, message: 'Two-factor authentication is required' },
  INVALID_VERIFICATION_CODE: { status: 401, message: 'Invalid verification code' },
  INVALID_SESSION_INFO: { status: 400, message: 'Invalid MFA session information' },
  INVALID_MFA_PENDING_CREDENTIAL: { status: 401, message: 'Invalid pending MFA credential' },
  TOO_MANY_ATTEMPTS_TRY_LATER: { status: 429, message: 'Too many attempts, please retry later' },
  OPERATION_NOT_ALLOWED: { status: 403, message: 'This operation is not enabled in Firebase' },
  WEAK_PASSWORD: { status: 400, message: 'Password is too weak' },
  INVALID_EMAIL: { status: 400, message: 'Invalid email address' },
  ACCOUNT_EMAIL_MISSING: {
    status: 400,
    message: 'Unable to resolve account email before deletion',
  },
  MFA_SESSION_MISSING: {
    status: 502,
    message: 'Firebase did not return MFA session information',
  },
  TOTP_SETUP_INVALID: {
    status: 502,
    message: 'Firebase did not return TOTP enrollment details',
  },
  FIREBASE_REQUEST_FAILED: DEFAULT_FIREBASE_AUTH_ERROR,
}
