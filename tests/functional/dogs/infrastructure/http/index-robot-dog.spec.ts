import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/dogs', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return paginated robot dogs', async ({ client, assert, cleanup }) => {
    // index() is admin-only in RobotDogPolicy
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-001',
      key: 'ABCDEFGHIJKLMNOPQR',
      name: 'Rex',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
      lastHeartbeat: DateTime.now(),
    })

    await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-002',
      key: 'QRSTUVWXYZABCDEFG1',
      name: 'Bolt',
      state: RobotDogState.IDLE,
      batteryLevel: 70,
      lastHeartbeat: DateTime.now(),
    })

    const response = await client
      .get('/api/v1/dogs?page=1&limit=10')
      .header('Authorization', auth.header)
    response.assertStatus(200)

    const body = response.body()

    assert.lengthOf(body.data, 2)

    assert.includeMembers(
      body.data.map((d: { serialNumber: string }) => d.serialNumber),
      ['SN-001', 'SN-002']
    )

    assert.equal(body.meta.total, 2)
    assert.equal(body.meta.currentPage, 1)
    assert.equal(body.meta.lastPage, 1)
    assert.equal(body.meta.perPage, 10)
  })

  test('should return empty pagination if no robot dogs', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .get('/api/v1/dogs?page=1&limit=10')
      .header('Authorization', auth.header)
    response.assertStatus(200)

    const body = response.body()

    assert.lengthOf(body.data, 0)
    assert.equal(body.meta.total, 0)
    assert.equal(body.meta.currentPage, 1)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client
      .get('/api/v1/dogs?page=1&limit=10')
      .header('Authorization', auth.header)

    response.assertStatus(403)
  })
})
