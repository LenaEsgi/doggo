import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

test.group('StartSessionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let useCase: StartSessionCommandUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    useCase = new StartSessionCommandUseCase(fakeRepo, fakeMqtt)
    events = emitter.fake()
    return () => emitter.restore()
  })

  test('exposes RobotCommand.START_SESSION as its command', ({ assert }) => {
    assert.equal(useCase.command, RobotCommand.START_SESSION)
  })

  test('envoie la commande MQTT avant de persister', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const callOrder: string[] = []
    const originalSend = fakeMqtt.sendCommand.bind(fakeMqtt)
    fakeMqtt.sendCommand = async (dogId, command, missionId) => {
      callOrder.push('mqtt')
      return originalSend(dogId, command, missionId)
    }
    const originalSave = fakeRepo.save.bind(fakeRepo)
    fakeRepo.save = async (d) => {
      callOrder.push('save')
      return originalSave(d)
    }

    await useCase.execute(dog.id.value)

    assert.deepEqual(callOrder, ['mqtt', 'save'])
  })

  test('ne persiste pas si la publication MQTT échoue', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)
    fakeMqtt.shouldFail = true

    let saveCalled = false
    fakeRepo.save = async () => {
      saveCalled = true
    }

    await assert.rejects(() => useCase.execute(dog.id.value))
    assert.isFalse(saveCalled)
    events.assertNotEmitted(DogStateChangedEvent)
  })

  test('passe le robot à IN_SESSION', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute(dog.id.value)

    const saved = await fakeRepo.findById(dog.id)
    assert.equal(saved!.state, RobotDogState.IN_SESSION)
  })

  test('publie DogStateChangedEvent avec le nouvel état IN_SESSION', async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute(dog.id.value)

    events.assertEmitted(
      DogStateChangedEvent,
      ({ data }) => data.dogId === dog.id.value && data.state === RobotDogState.IN_SESSION
    )
  })
})
