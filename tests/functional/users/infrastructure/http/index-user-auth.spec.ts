import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import type { DecodedIdToken } from 'firebase-admin/auth'

class FakeFirebaseTokenVerifier extends FirebaseTokenVerifier {
  constructor(private readonly implementation: (idToken: string) => Promise<DecodedIdToken>) {
    super()
  }

  handle(idToken: string): Promise<DecodedIdToken> {
    return this.implementation(idToken)
  }
}

test.group('GET /users auth', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return 401 when no bearer token is provided', async ({ client }) => {
    const response = await client.get('/users')

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Token missing',
    })
  })

  test('should return users when bearer token is valid', async ({ client, assert, cleanup }) => {
    app.container.swap(
      FirebaseTokenVerifier,
      () =>
        new FakeFirebaseTokenVerifier(async (idToken) => {
          assert.equal(idToken, 'valid-id-token')

          return {
            uid: 'firebase-uid-1',
            aud: 'doggo-application',
            auth_time: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            iss: 'https://securetoken.google.com/doggo-application',
            sub: 'firebase-uid-1',
            email: 'john@example.com',
            firebase: {
              identities: {},
              sign_in_provider: 'password',
            },
          }
        })
    )

    cleanup(() => app.container.restore(FirebaseTokenVerifier))

    const response = await client.get('/users').header('Authorization', 'Bearer valid-id-token')

    response.assertStatus(200)

    const body = response.body()

    assert.exists(body.users)
  })
})
