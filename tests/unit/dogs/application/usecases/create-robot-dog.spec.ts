import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { CreateRobotDogUseCaseImplementation } from '#dogs/application/usecases/create-robot-dog.use-case.implementation'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-existe.error'

test.group('CreateRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let useCase: CreateRobotDogUseCaseImplementation

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    useCase = new CreateRobotDogUseCaseImplementation(fakeRepo)
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

  test('should throw if serial number already exists', async ({ assert }) => {
    const existingDog = RobotDog.create('SN-001', 'Existing', 90)
    await fakeRepo.save(existingDog)

    await assert.rejects(
      () =>
        useCase.execute({
          serialNumber: 'SN-001',
          name: 'AnotherDog',
          batteryLevel: 70,
        }),
      RobotDogSerialNumberAlreadyExistsError
    )

    assert.lengthOf(fakeRepo.storedDogs, 1)
  })
})
