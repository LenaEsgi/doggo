import { test } from '@japa/runner'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('GET /dogs', (group) => {

  group.each.setup(() => testUtils.db().truncate())

  test('should return all robot dogs', async ({ client, assert }) => {
    await RobotDogModel.create({
      serialNumber: 'SN-001',
      key: 'ABCDEFGHIJKLMN1234',
      name: 'Rex',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
      lastHeartbeat: DateTime.now(),
    })

    await RobotDogModel.create({
      serialNumber: 'SN-002',
      key: 'ZYXWVUTSRQPONML567',
      name: 'Bolt',
      state: RobotDogState.IDLE,
      batteryLevel: 70,
      lastHeartbeat: DateTime.now(),
    })

    const response = await client.get('/dogs')
    response.assertStatus(200)

    const body = response.body()
    assert.lengthOf(body, 2)
    assert.includeMembers(
      body.map((d: { serialNumber: any }) => d.serialNumber),
      ['SN-001', 'SN-002']
    )
  })

  test('should return empty array if no robot dogs', async ({ client, assert }) => {
    const response = await client.get('/dogs')
    response.assertStatus(200)

    const body = response.body()
    assert.lengthOf(body, 0)
  })
})
