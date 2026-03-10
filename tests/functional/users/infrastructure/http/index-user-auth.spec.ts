import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import UserModel from '#users/infrastructure/database/models/user'
import { UserRole } from '#users/domain/enums/user.role'
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

    await UserModel.create({
      firebaseUid: 'firebase-uid-1',
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
      role: UserRole.USER,
    })

    const response = await client.get('/users').header('Authorization', 'Bearer valid-id-token')

    response.assertStatus(200)

    const body = response.body()

    assert.lengthOf(body.users, 1)
    assert.equal(body.users[0].firebaseUid, 'firebase-uid-1')
    assert.equal(body.users[0].email, 'john@example.com')
    assert.equal(body.users[0].firstname, 'John')
    assert.equal(body.users[0].lastname, 'Doe')
    assert.equal(body.users[0].role, 'user')
  })
})
