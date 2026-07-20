import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/dogs/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return robot dog if found', async ({ client, assert, cleanup }) => {
    // show() allows ADMIN via RobotDogPolicy#before, or the owning USER
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const createResponse = await client
      .post('/api/v1/dogs')
      .header('Authorization', auth.header)
      .json({
        serialNumber: 'SN-SHOW-001',
        name: 'Rex',
      })
    createResponse.assertStatus(201)
    const dogId = createResponse.body().id

    const response = await client.get(`/api/v1/dogs/${dogId}`).header('Authorization', auth.header)
    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.id, dogId)
    assert.equal(body.serialNumber, 'SN-SHOW-001')
    assert.equal(body.name, 'Rex')
    assert.equal(body.batteryLevel, 100)
    assert.isString(body.key)
    assert.lengthOf(body.key, 18)
  })

  test('should return 404 if robot dog not found', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .get('/api/v1/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .header('Authorization', auth.header)

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found',
    })
  })

  test('should return 401 when no bearer token is provided', async ({ client }) => {
    const response = await client.get('/api/v1/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')

    response.assertStatus(401)
  })
})
