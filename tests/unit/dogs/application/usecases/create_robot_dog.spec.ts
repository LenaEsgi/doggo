import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake_robot_dog_repository'
import {
  CreateRobotDogUseCase
} from '../../../../../app/modules/dogs/application/usecases/create-robot-dog.use-case.js'

test.group('CreateRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let useCase: CreateRobotDogUseCase

  group.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    useCase = new CreateRobotDogUseCase(fakeRepo)
  })

  test('should create and save a robot dog', async ({ assert }) => {
    await useCase.execute({
      serialNumber: 'SN-001',
      name: 'Rex',
      batteryLevel: 80,
    })

    assert.lengthOf(fakeRepo.storedDogs, 1)

    const savedDog = fakeRepo.storedDogs[0]

    assert.equal(savedDog.serialNumber, 'SN-001')
    assert.equal(savedDog.name, 'Rex')
    assert.equal(savedDog.batteryLevel, 80)
  })
})
