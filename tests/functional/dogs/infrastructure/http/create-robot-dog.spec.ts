import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('POST /dogs', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create a new robot dog', async ({ client }) => {
    const response = await client.post('/dogs').json({
      serialNumber: 'SN-HTTP-001',
      name: 'TestHTTP',
      batteryLevel: 90,
    })

    response.assertStatus(201)

    response.assertBodyContains({
      message: 'RobotDog created',
    })
  })
})
