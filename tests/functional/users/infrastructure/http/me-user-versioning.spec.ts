import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('GET /users/me API versioning', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('v1 keeps the legacy firstname/lastname contract', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup)

    const response = await client.get('/api/v1/users/me').header('Authorization', auth.header)

    response.assertStatus(200)
    const body = response.body()
    assert.equal(body.firstname, auth.user.firstname)
    assert.equal(body.lastname, auth.user.lastname)
    assert.notProperty(body, 'firstName')
    assert.notProperty(body, 'lastName')
  })

  test('v2 introduces the breaking camelCase firstName/lastName contract', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup)

    const response = await client.get('/api/v2/users/me').header('Authorization', auth.header)

    response.assertStatus(200)
    const body = response.body()
    assert.equal(body.firstName, auth.user.firstname)
    assert.equal(body.lastName, auth.user.lastname)
    assert.notProperty(body, 'firstname')
    assert.notProperty(body, 'lastname')
  })

  test('v1 and v2 agree on the unchanged fields for the same user', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup)

    const v1Response = await client.get('/api/v1/users/me').header('Authorization', auth.header)
    const v2Response = await client.get('/api/v2/users/me').header('Authorization', auth.header)
    const v1 = v1Response.body()
    const v2 = v2Response.body()

    assert.equal(v1.id, v2.id)
    assert.equal(v1.email, v2.email)
    assert.equal(v1.role, v2.role)
  })
})
