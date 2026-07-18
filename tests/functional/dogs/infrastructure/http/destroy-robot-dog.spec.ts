import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('DELETE /api/v1/dogs/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return 204 when robot dog is deleted', async ({ client, assert, cleanup }) => {
    // destroy() is admin-only in RobotDogPolicy
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-DEL-001',
      key: 'AbC123xYz987LmNoPq',
      name: 'DeleteMe',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
      lastHeartbeat: DateTime.now(),
    })

    const response = await client
      .delete(`/api/v1/dogs/${dog.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(204)

    const deleted = await RobotDogModel.find(dog.id)
    assert.isNull(deleted)
  })

  test('should return 404 when robot dog does not exist', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .delete('/api/v1/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .header('Authorization', auth.header)

    response.assertStatus(404)

    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found',
    })
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-DEL-002',
      key: 'BcD234yZa098MnOpQr',
      name: 'KeepMe',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
      lastHeartbeat: DateTime.now(),
    })

    const response = await client
      .delete(`/api/v1/dogs/${dog.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(403)
  })
})
