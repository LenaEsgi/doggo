import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDog } from '#dogs/domain/robot-dog.entity'

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

    const response = await client.get('/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found'
    })
  })
})
