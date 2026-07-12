import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('PUT /api/v1/dogs/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should update robot dog name and return 204', async ({ client, assert, cleanup }) => {
    // update() allows ADMIN via RobotDogPolicy#before, or the owning USER
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const createResponse = await client
      .post('/api/v1/dogs')
      .header('Authorization', auth.header)
      .json({
        serialNumber: 'SN-UPD-001',
        name: 'OldName',
        batteryLevel: 80,
      })
    createResponse.assertStatus(201)
    const dogId = createResponse.body().id

    const response = await client
      .put(`/api/v1/dogs/${dogId}`)
      .header('Authorization', auth.header)
      .json({ name: 'NewName' })

    response.assertStatus(204)

    const updated = await RobotDogModel.find(dogId)
    assert.exists(updated)
    assert.equal(updated!.name, 'NewName')
  })

  test('should return 404 if robot dog does not exist', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .put('/api/v1/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .header('Authorization', auth.header)
      .json({ name: 'NewName' })

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found',
    })
  })

  test('should return 401 when no bearer token is provided', async ({ client }) => {
    const response = await client
      .put('/api/v1/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .json({ name: 'NewName' })

    response.assertStatus(401)
  })
})
