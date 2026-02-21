import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'

test.group('PUT /dogs/:id', (group) => {

  group.each.setup(() => testUtils.db().truncate())

  test('should update robot dog name and return 204', async ({ client, assert }) => {
    const dog = await RobotDogModel.create({
      serialNumber: 'SN-UPD-001',
      key: 'ZYXWVUTSRQPONML567',
      name: 'OldName',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
      lastHeartbeat: DateTime.now(),
    })

    const response = await client
      .put(`/dogs/${dog.id}`)
      .json({ name: 'NewName' })

    response.assertStatus(204)

    const updated = await RobotDogModel.find(dog.id)
    assert.exists(updated)
    assert.equal(updated!.name, 'NewName')
  })

  test('should return 404 if robot dog does not exist', async ({ client }) => {
    const response = await client
      .put('/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .json({ name: 'NewName' })

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found'
    })
  })
})
