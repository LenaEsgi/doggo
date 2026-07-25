import { test } from '@japa/runner'
import { FirebaseAuthProviderError } from '#auth/domain/exceptions/firebase-auth-provider.error'

test.group('FirebaseAuthProviderError', () => {
  test('maps INVALID_LOGIN_CREDENTIALS to a clear 401 message', ({ assert }) => {
    const error = new FirebaseAuthProviderError('INVALID_LOGIN_CREDENTIALS')

    assert.equal(error.status, 401)
    assert.equal(error.message, 'Invalid email or password')
    assert.equal(error.code, 'INVALID_LOGIN_CREDENTIALS')
  })

  test('maps the legacy EMAIL_NOT_FOUND/INVALID_PASSWORD codes to the same message', ({
    assert,
  }) => {
    const emailNotFound = new FirebaseAuthProviderError('EMAIL_NOT_FOUND')
    const invalidPassword = new FirebaseAuthProviderError('INVALID_PASSWORD')

    assert.equal(emailNotFound.status, 401)
    assert.equal(emailNotFound.message, 'Invalid email or password')
    assert.equal(invalidPassword.status, 401)
    assert.equal(invalidPassword.message, 'Invalid email or password')
  })

  test('falls back to a generic error for an unmapped code', ({ assert }) => {
    const error = new FirebaseAuthProviderError('SOME_UNKNOWN_FIREBASE_CODE')

    assert.equal(error.status, 400)
    assert.equal(error.message, 'Firebase authentication request failed')
    assert.equal(error.code, 'SOME_UNKNOWN_FIREBASE_CODE')
  })
})
