import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'

test.group('GET /dogs/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return robot dog if found', async ({ client, assert }) => {
    // Création d'un robot dog réel
    const dog = await RobotDogModel.create({
      serialNumber: 'SN-001',
      key: 'ZYXWVUTSRQPONML567',
      name: 'Rex',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
      lastHeartbeat: DateTime.now(),
    })

    const response = await client.get(`/dogs/${dog.id}`)
    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.id, dog.id)
    assert.equal(body.serialNumber, 'SN-001')
    assert.equal(body.name, 'Rex')
    assert.equal(body.batteryLevel, 80)
  })

  test('should return 404 if robot dog not found', async ({ client }) => {
    const response = await client.get('/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found',
    })
  })
})
