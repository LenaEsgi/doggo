import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { RobotDogRepository } from '../../../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'

test.group('GET /dogs/:id', () => {

  test('should return robot dog if found', async ({ client, assert }) => {

    const dog = RobotDog.create('SN-001', 'Rex', 80)

    class FakeRepository extends RobotDogRepository {
      async findById() {
        return dog
      }

      async findAll() {
        return []
      }

      async save() {}

      async delete() {}
    }

    app.container.swap(RobotDogRepository, () => new FakeRepository())

    const response = await client.get(`/dogs/${dog.id.value}`)
    response.assertStatus(200)

    const body = response.body()

    assert.equal(body.id, dog.id.value)
    assert.equal(body.serialNumber, 'SN-001')
    assert.equal(body.name, 'Rex')
    assert.equal(body.batteryLevel, 80)
  })

  test('should return 404 if robot dog not found', async ({ client }) => {

    class FakeRepository extends RobotDogRepository {
      async findById() {
        return null
      }

      async findAll() {
        return []
      }
      async save() {}
      async delete() {}
    }

    app.container.swap(RobotDogRepository, () => new FakeRepository())

    const response = await client.get('/dogs/non-existent-id')

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id non-existent-id not found'
    })
  })
})
