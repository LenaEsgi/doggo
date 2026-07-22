import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/dogs/by-serial/:serialNumber', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return the robot dog id for a known serial number', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const createResponse = await client
      .post('/api/v1/dogs')
      .header('Authorization', auth.header)
      .json({
        serialNumber: 'SN-BY-SERIAL-001',
        name: 'Rex',
      })
    createResponse.assertStatus(201)
    const dogId = createResponse.body().id

    const response = await client.get('/api/v1/dogs/by-serial/SN-BY-SERIAL-001')

    response.assertStatus(200)
    assert.deepEqual(response.body(), { data: { id: dogId } })
  })

  test('should return 404 when no robot dog has this serial number', async ({ client }) => {
    const response = await client.get('/api/v1/dogs/by-serial/SN-DOES-NOT-EXIST')

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id SN-DOES-NOT-EXIST not found',
    })
  })

  test('should not require authentication', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await client.post('/api/v1/dogs').header('Authorization', auth.header).json({
      serialNumber: 'SN-BY-SERIAL-002',
      name: 'Nova',
    })

    const response = await client.get('/api/v1/dogs/by-serial/SN-BY-SERIAL-002')

    response.assertStatus(200)
  })
})
