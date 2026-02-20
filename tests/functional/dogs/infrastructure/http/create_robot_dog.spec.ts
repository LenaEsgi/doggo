import { test } from '@japa/runner'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake_robot_dog_repository'
import app from '@adonisjs/core/services/app'

test.group('POST /dogs', (group) => {
  group.setup(() => {
    app.container.swap(RobotDogRepository, () => {
      return new FakeRobotDogRepository()
    })
  })

  test('should create a new robot dog', async ({ client }) => {
    const response = await client
      .post('/dogs')
      .json({
        serialNumber: 'SN-HTTP-001',
        name: 'TestHTTP',
        batteryLevel: 90,
      })

    response.assertStatus(201)

    response.assertBodyContains({
      message: 'RobotDog created'
    })
  })
})
