import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeLiveControlGateway } from '#tests/unit/fakes/fake-live-control-gateway'
import { DispatchLiveCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/dispatch-live-command.use-case'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidDogStateError } from '#dogs/domain/exceptions/invalid-dog-state-error'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { InvalidActionParametersError } from '#app/modules/actions/domain/exceptions/invalid-action-parameters.error'

test.group('DispatchLiveCommandUseCase', (group) => {
  let dogRepository: FakeRobotDogRepository
  let gateway: FakeLiveControlGateway
  let useCase: DispatchLiveCommandUseCase

  group.each.setup(() => {
    dogRepository = new FakeRobotDogRepository()
    gateway = new FakeLiveControlGateway()
    useCase = new DispatchLiveCommandUseCase(dogRepository, gateway)
  })

  test('refuse si le robot dog est introuvable', async ({ assert }) => {
    await assert.rejects(
      () => useCase.execute('00000000-0000-4000-8000-000000000099', 'BARK', {}),
      RobotDogNotFoundError
    )
  })

  test("refuse si le robot n'est pas IN_SESSION", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dogRepository.storedDogs.push(dog)

    await assert.rejects(() => useCase.execute(dog.id.value, 'BARK', {}), InvalidDogStateError)
    assert.lengthOf(gateway.calls, 0)
  })

  test('refuse un actionCode inconnu (hors catalogue live figé)', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startSession()
    dogRepository.storedDogs.push(dog)

    await assert.rejects(
      () => useCase.execute(dog.id.value, 'UNKNOWN_CODE', {}),
      ActionNotFoundError
    )
  })

  test('refuse des paramètres hors bornes du schema figé', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startSession()
    dogRepository.storedDogs.push(dog)

    await assert.rejects(
      () => useCase.execute(dog.id.value, 'MOVE_FORWARD', { speed: 150 }),
      InvalidActionParametersError
    )
    assert.lengthOf(gateway.calls, 0)
  })

  test('relaie la commande au gateway quand tout est valide, sans accès DB au catalogue', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startSession()
    dogRepository.storedDogs.push(dog)

    await useCase.execute(dog.id.value, 'JUMP', {})

    assert.lengthOf(gateway.calls, 1)
    assert.equal(gateway.calls[0].dogId, dog.id.value)
    assert.equal(gateway.calls[0].actionCode, 'JUMP')
  })
})
