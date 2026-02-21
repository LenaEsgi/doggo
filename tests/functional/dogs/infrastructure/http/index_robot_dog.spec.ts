import { test } from '@japa/runner'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('GET /dogs', (group) => {

  group.each.setup(() => testUtils.db().truncate())

  test('should return paginated robot dogs', async ({ client, assert }) => {
    await RobotDogModel.create({
      serialNumber: 'SN-001',
      key: 'ABCDEFGHIJKLMNOPQR',
      name: 'Rex',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
      lastHeartbeat: DateTime.now(),
    })

    await RobotDogModel.create({
      serialNumber: 'SN-002',
      key: 'QRSTUVWXYZABCDEFG1',
      name: 'Bolt',
      state: RobotDogState.IDLE,
      batteryLevel: 70,
      lastHeartbeat: DateTime.now(),
    })

    const response = await client.get('/dogs?page=1&limit=10')
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

  test('should return empty pagination if no robot dogs', async ({ client, assert }) => {
    const response = await client.get('/dogs?page=1&limit=10')
    response.assertStatus(200)

    const body = response.body()

    assert.lengthOf(body.data, 0)
    assert.equal(body.meta.total, 0)
    assert.equal(body.meta.currentPage, 1)
  })
})
