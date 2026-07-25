import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('POST /api/v1/dogs', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create a new robot dog with an auto-generated serial number', async ({
    client,
    assert,
    cleanup,
  }) => {
    // create() is admin-only in RobotDogPolicy
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client.post('/api/v1/dogs').header('Authorization', auth.header).json({
      name: 'TestHTTP',
    })

    response.assertStatus(201)

    const body = response.body()
    assert.exists(body.id)
    assert.match(body.serialNumber, /^SN-\d{6}$/)
    assert.exists(body.mqtt)
    assert.equal(body.mqtt.username, body.id)
    assert.isString(body.mqtt.password)
    assert.isAbove(body.mqtt.password.length, 16)

    const created = await RobotDogModel.find(body.id)
    assert.exists(created)
    assert.equal(created!.serialNumber, body.serialNumber)
    assert.equal(created!.name, 'TestHTTP')
    assert.equal(created!.batteryLevel, 100)
  })

  test('should generate distinct serial numbers for successive creations', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const first = await client.post('/api/v1/dogs').header('Authorization', auth.header).json({ name: 'First' })
    const second = await client.post('/api/v1/dogs').header('Authorization', auth.header).json({ name: 'Second' })

    first.assertStatus(201)
    second.assertStatus(201)
    assert.notEqual(first.body().serialNumber, second.body().serialNumber)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client.post('/api/v1/dogs').header('Authorization', auth.header).json({
      name: 'ForbiddenHTTP',
    })

    response.assertStatus(403)
  })
})
