import { test } from '@japa/runner'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('DELETE /dogs/:id', (group) => {

  group.each.setup(() => testUtils.db().truncate())

  test('should return 204 when robot dog is deleted', async ({ client, assert }) => {
    const dog = await RobotDogModel.create({
      serialNumber: 'SN-DEL-001',
      key: 'AbC123xYz987LmNoPq',
      name: 'DeleteMe',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
      lastHeartbeat: DateTime.now(),
    })

    const response = await client.delete(`/dogs/${dog.id}`)

    response.assertStatus(204)

    const deleted = await RobotDogModel.find(dog.id)
    assert.isNull(deleted)
  })

  test('should return 404 when robot dog does not exist', async ({ client }) => {
    const response = await client.delete('/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')

    response.assertStatus(404)

    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found',
    })
  })
})
