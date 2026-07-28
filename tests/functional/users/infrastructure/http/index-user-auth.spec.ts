import { test } from '@japa/runner'
import { truncateDb } from '#tests/functional/helpers/truncate'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/users auth', (group) => {
  group.each.setup(() => truncateDb())

  test('should return 401 when no bearer token is provided', async ({ client }) => {
    const response = await client.get('/api/v1/users')

    response.assertStatus(401)
    response.assertBodyContains({
      message: 'Token missing',
    })
  })

  test('should return users when bearer token is valid', async ({ client, assert, cleanup }) => {
    // index() is admin-only in UserPolicy
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client.get('/api/v1/users').header('Authorization', auth.header)

    response.assertStatus(200)

    const body = response.body()

    assert.exists(body.data)
    assert.isArray(body.data)
    assert.equal(body.data.length, 1)
    assert.equal(body.data[0].id, auth.user.id)
  })

  test('should return 200 for a non-admin user with a valid search query', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client
      .get('/api/v1/users?search=ali')
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const body = response.body()
    assert.exists(body.data)
    assert.isArray(body.data)
  })
})
