import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogRepository } from '../../../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'

test.group('GET /dogs', () => {

  test('should return all robot dogs', async ({ client, assert }) => {

    class FakeRepo extends RobotDogRepository {
      public dogs = [
        RobotDog.create('SN-001', 'Rex', 80),
        RobotDog.create('SN-002', 'Bolt', 70),
      ]

      async findAll() {
        return this.dogs
      }

      async findById(id: any) {
        return this.dogs.find(d => d.id.equals(id)) ?? null
      }

      async save() {}
      async delete() {}
    }

    app.container.swap(RobotDogRepository, () => new FakeRepo())

    const response = await client.get('/dogs')
    response.assertStatus(200)

    const body = response.body()
    assert.lengthOf(body, 2)
    assert.equal(body[0].serialNumber, 'SN-001')
    assert.equal(body[1].serialNumber, 'SN-002')
  })

  test('should return empty array if no robot dogs', async ({ client, assert }) => {

    class EmptyRepo extends RobotDogRepository {
      async findAll() { return [] }
      async findById(_: any) { return null }
      async save() {}
      async delete() {}
    }

    app.container.swap(RobotDogRepository, () => new EmptyRepo())

    const response = await client.get('/dogs')
    response.assertStatus(200)

    const body = response.body()
    assert.lengthOf(body, 0)
  })
})
