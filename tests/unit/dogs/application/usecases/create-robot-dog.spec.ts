import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMqttAccountProvisioner } from '#tests/unit/fakes/fake-mqtt-account-provisioner'
import { FakeRobotDogSerialNumberGenerator } from '#tests/unit/fakes/fake-robot-dog-serial-number-generator'
import { CreateRobotDogUseCase } from '#dogs/application/usecases/create-robot-dog.use-case'
import { MqttAccountProvisioningFailedError } from '#dogs/domain/exceptions/mqtt-account-provisioning-failed.error'

test.group('CreateRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeProvisioner: FakeMqttAccountProvisioner
  let fakeSerialGenerator: FakeRobotDogSerialNumberGenerator
  let useCase: CreateRobotDogUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeProvisioner = new FakeMqttAccountProvisioner()
    fakeSerialGenerator = new FakeRobotDogSerialNumberGenerator()
    useCase = new CreateRobotDogUseCase(fakeRepo, fakeProvisioner, fakeSerialGenerator)
  })

  test('should create and save a robot dog with a generated serial number', async ({ assert }) => {
    const result = await useCase.execute({ name: 'Rex' })

    assert.lengthOf(fakeRepo.storedDogs, 1)

    const savedDog = fakeRepo.storedDogs[0]

    assert.match(savedDog.serialNumber, /^SN-\d{6}$/)
    assert.equal(savedDog.name, 'Rex')
    assert.equal(savedDog.batteryLevel, 100)
    assert.equal(result.robotDog.id.value, savedDog.id.value)
  })

  test('should generate distinct serial numbers across successive creations', async ({ assert }) => {
    const first = await useCase.execute({ name: 'Rex' })
    const second = await useCase.execute({ name: 'Kobe' })

    assert.notEqual(first.robotDog.serialNumber, second.robotDog.serialNumber)
  })

  test('should provision an MQTT account using the robot id as username', async ({ assert }) => {
    const result = await useCase.execute({ name: 'Kobe' })

    assert.lengthOf(fakeProvisioner.provisionedAccounts, 1)
    assert.equal(fakeProvisioner.provisionedAccounts[0].username, result.robotDog.id.value)
    assert.equal(fakeProvisioner.provisionedAccounts[0].password, result.mqttPassword)
    assert.isAbove(result.mqttPassword.length, 16)
  })

  test('should roll back the robot dog creation when MQTT provisioning fails', async ({ assert }) => {
    fakeProvisioner.shouldFailProvisioning = true

    await assert.rejects(
      () => useCase.execute({ name: 'Buddy' }),
      MqttAccountProvisioningFailedError
    )

    assert.lengthOf(fakeRepo.storedDogs, 0)
  })
})
