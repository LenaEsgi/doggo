import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'

test.group('PUT /dogs/:id', (group) => {

  group.teardown(() => {
    app.container.restore(RobotDogRepository)
  })

  test('should update robot dog name and return 204', async ({ client, assert }) => {

    const dog = RobotDog.create('SN-UPD-001', 'OldName', 80)

    class FakeRepository extends RobotDogRepository {
      private dogs = [dog]

      async findById(id: any) {
        return this.dogs.find(d => d.id.equals(id)) ?? null
      }

      async save(updatedDog: any) {
        const index = this.dogs.findIndex(d => d.id.equals(updatedDog.id))
        if (index >= 0) {
          this.dogs[index] = updatedDog
        }
      }

      async delete() {}
      async findAll() { return this.dogs }
    }

    const fakeRepo = new FakeRepository()
    app.container.swap(RobotDogRepository, () => fakeRepo)

    const response = await client
      .put(`/dogs/${dog.id.value}`)
      .json({ name: 'NewName' })

    response.assertStatus(204)

    const updated = await fakeRepo.findById(dog.id)
    assert.equal(updated?.name, 'NewName')
  })

  test('should return 404 if robot dog does not exist', async ({ client }) => {

    class FakeRepository extends RobotDogRepository {
      async findById() { return null }
      async save() {}
      async delete() {}
      async findAll() { return [] }
    }

    app.container.swap(RobotDogRepository, () => new FakeRepository())

    const response = await client
      .put('/dogs/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .json({ name: 'NewName' })

    response.assertStatus(404)
    response.assertBodyContains({
      message: 'RobotDog with id 56a39d4d-b05d-42fb-a402-6782fc66dc3d not found'
    })
  })
})
