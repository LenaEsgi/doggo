import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { CreateRobotDogUseCase } from '#dogs/application/usecases/create-robot-dog.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-exists.error'

test.group('CreateRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let useCase: CreateRobotDogUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    useCase = new CreateRobotDogUseCase(fakeRepo)
  })

  test('should create and save a robot dog', async ({ assert }) => {
    await useCase.execute({
      serialNumber: 'SN-001',
      name: 'Rex',
    })

    assert.lengthOf(fakeRepo.storedDogs, 1)

    const savedDog = fakeRepo.storedDogs[0]

    assert.equal(savedDog.serialNumber, 'SN-001')
    assert.equal(savedDog.name, 'Rex')
    assert.equal(savedDog.batteryLevel, 100)
  })

  test('should throw if serial number already exists', async ({ assert }) => {
    const existingDog = RobotDog.create('SN-001', 'Existing', 90)
    await fakeRepo.save(existingDog)

    await assert.rejects(
      () =>
        useCase.execute({
          serialNumber: 'SN-001',
          name: 'AnotherDog',
        }),
      RobotDogSerialNumberAlreadyExistsError
    )

    assert.lengthOf(fakeRepo.storedDogs, 1)
  })
})
