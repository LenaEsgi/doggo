import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMqttAccountProvisioner } from '#tests/unit/fakes/fake-mqtt-account-provisioner'
import { DestroyRobotDogUseCase } from '#dogs/application/usecases/destroy-robot-dog.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'

test.group('DestroyRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeProvisioner: FakeMqttAccountProvisioner
  let useCase: DestroyRobotDogUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeProvisioner = new FakeMqttAccountProvisioner()
    useCase = new DestroyRobotDogUseCase(fakeRepo, fakeProvisioner)
  })

  test('should delete a robot dog if it exists', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute({ id: dog.id.value })

    const result = await fakeRepo.findById(dog.id)
    assert.isNull(result)
    assert.lengthOf(fakeRepo.storedDogs, 0)
  })

  test('should throw RobotDogNotFoundError if dog does not exist', async ({ assert }) => {
    const nonExistentId = '56a39d4d-b05d-42fb-a402-6782fc66dc3d'

    await assert.rejects(() => useCase.execute({ id: nonExistentId }), RobotDogNotFoundError)
  })

  test('should deprovision the MQTT account before deleting the robot dog', async ({ assert }) => {
    const dog = RobotDog.create('SN-DESTROY-001', 'ToDelete', 80)
    await fakeRepo.save(dog)

    await useCase.execute({ id: dog.id.value })

    assert.deepEqual(fakeProvisioner.deprovisionedUsernames, [dog.id.value])
    assert.lengthOf(fakeRepo.storedDogs, 0)
  })

  test('should not delete the robot dog when MQTT deprovisioning fails', async ({ assert }) => {
    const dog = RobotDog.create('SN-DESTROY-002', 'KeepOnFailure', 80)
    await fakeRepo.save(dog)
    fakeProvisioner.deprovisionRobotAccount = async () => {
      throw new Error('dynsec deleteClient failed')
    }

    await assert.rejects(() => useCase.execute({ id: dog.id.value }))

    assert.lengthOf(fakeRepo.storedDogs, 1)
  })
})
