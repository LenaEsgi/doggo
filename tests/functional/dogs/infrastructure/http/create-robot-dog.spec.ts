import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('POST /api/v1/dogs', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create a new robot dog', async ({ client, assert, cleanup }) => {
    // create() is admin-only in RobotDogPolicy
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client.post('/api/v1/dogs').header('Authorization', auth.header).json({
      serialNumber: 'SN-HTTP-001',
      name: 'TestHTTP',
      batteryLevel: 90,
    })

    response.assertStatus(201)

    const body = response.body()
    assert.exists(body.id)

    const created = await RobotDogModel.find(body.id)
    assert.exists(created)
    assert.equal(created!.serialNumber, 'SN-HTTP-001')
    assert.equal(created!.name, 'TestHTTP')
    assert.equal(created!.batteryLevel, 90)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client.post('/api/v1/dogs').header('Authorization', auth.header).json({
      serialNumber: 'SN-HTTP-002',
      name: 'ForbiddenHTTP',
      batteryLevel: 50,
    })

    response.assertStatus(403)
  })
})
