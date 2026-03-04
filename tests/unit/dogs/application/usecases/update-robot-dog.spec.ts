import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake_robot_dog_repository'
import { UpdateRobotDogUseCaseImplementation } from '../../../../../app/modules/dogs/application/usecases/update-robot-dog.use-case.implementation.js'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '../../../../../app/modules/dogs/domain/exceptions/robot-dog-not-found.error.js'

test.group('UpdateRobotDogUseCaseImplementation', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let useCase: UpdateRobotDogUseCaseImplementation

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    useCase = new UpdateRobotDogUseCaseImplementation(fakeRepo)
  })

  test('should update the name successfully', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute({ id: dog.id.value, name: 'Bolt' })

    const updated = await fakeRepo.findById(dog.id)
    assert.equal(updated?.name, 'Bolt')
  })

  test('should throw RobotDogNotFoundError if robot does not exist', async ({ assert }) => {
    await assert.rejects(
      async () =>
        await useCase.execute({ id: '56a39d4d-b05d-42fb-a402-6782fc66dc3d', name: 'Bolt' }),
      RobotDogNotFoundError
    )
  })
})
