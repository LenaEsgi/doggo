import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { RobotDog } from '../../../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogRepository } from '../../../../../app/modules/dogs/domain/contracts/robot_dog.repository.js'

test.group('DELETE /dogs/:id', (group) => {

  group.teardown(() => {
    app.container.restore(RobotDogRepository)
  })

  test('should return 204 when robot dog is deleted', async ({ client }) => {

    const dog = RobotDog.create('SN-DEL-001', 'DeleteMe', 80)

    class FakeRepository extends RobotDogRepository {
      private dogs = [dog]

      async findById(id: any) {
        return this.dogs.find(d => d.id.equals(id)) ?? null
      }

      async delete(id: any) {
        this.dogs = this.dogs.filter(d => !d.id.equals(id))
      }

      async findAll() { return this.dogs }
      async save() {}
    }

    app.container.swap(RobotDogRepository, () => new FakeRepository())

    const response = await client.delete(`/dogs/${dog.id.value}`)

    response.assertStatus(204)
  })

  test('should return 404 when robot dog does not exist', async ({ client }) => {

    class FakeRepository extends RobotDogRepository {
      async findById() {
        return null
      }

      async delete() {}
      async findAll() { return [] }
      async save() {}
    }

    app.container.swap(RobotDogRepository, () => new FakeRepository())

    const response = await client.delete('/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found'
    })
  })
})
