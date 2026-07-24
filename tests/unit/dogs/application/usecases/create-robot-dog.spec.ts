import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMqttAccountProvisioner } from '#tests/unit/fakes/fake-mqtt-account-provisioner'
import { CreateRobotDogUseCase } from '#dogs/application/usecases/create-robot-dog.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-exists.error'
import { MqttAccountProvisioningFailedError } from '#dogs/domain/exceptions/mqtt-account-provisioning-failed.error'

test.group('CreateRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeProvisioner: FakeMqttAccountProvisioner
  let useCase: CreateRobotDogUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeProvisioner = new FakeMqttAccountProvisioner()
    useCase = new CreateRobotDogUseCase(fakeRepo, fakeProvisioner)
  })

  test('should create and save a robot dog', async ({ assert }) => {
    const result = await useCase.execute({
      serialNumber: 'SN-001',
      name: 'Rex',
    })

    assert.lengthOf(fakeRepo.storedDogs, 1)

    const savedDog = fakeRepo.storedDogs[0]

    assert.equal(savedDog.serialNumber, 'SN-001')
    assert.equal(savedDog.name, 'Rex')
    assert.equal(savedDog.batteryLevel, 100)
    assert.equal(result.robotDog.id.value, savedDog.id.value)
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

  test('should provision an MQTT account using the robot id as username', async ({ assert }) => {
    const result = await useCase.execute({
      serialNumber: 'SN-002',
      name: 'Kobe',
    })

    assert.lengthOf(fakeProvisioner.provisionedAccounts, 1)
    assert.equal(fakeProvisioner.provisionedAccounts[0].username, result.robotDog.id.value)
    assert.equal(fakeProvisioner.provisionedAccounts[0].password, result.mqttPassword)
    assert.isAbove(result.mqttPassword.length, 16)
  })

  test('should roll back the robot dog creation when MQTT provisioning fails', async ({ assert }) => {
    fakeProvisioner.shouldFailProvisioning = true

    await assert.rejects(
      () =>
        useCase.execute({
          serialNumber: 'SN-003',
          name: 'Buddy',
        }),
      MqttAccountProvisioningFailedError
    )

    assert.lengthOf(fakeRepo.storedDogs, 0)
  })
})
