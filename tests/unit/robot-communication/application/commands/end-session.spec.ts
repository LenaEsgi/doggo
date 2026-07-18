import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

test.group('EndSessionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let useCase: EndSessionCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    useCase = new EndSessionCommandUseCase(fakeRepo, fakeMqtt)
  })

  test('exposes RobotCommand.END_SESSION as its command', ({ assert }) => {
    assert.equal(useCase.command, RobotCommand.END_SESSION)
  })

  test('envoie la commande MQTT avant de persister', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startSession()
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
    dog.startSession()
    await fakeRepo.save(dog)
    fakeMqtt.shouldFail = true

    let saveCalled = false
    fakeRepo.save = async () => {
      saveCalled = true
    }

    await assert.rejects(() => useCase.execute(dog.id.value))
    assert.isFalse(saveCalled)
  })

  test('passe le robot à IDLE', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startSession()
    await fakeRepo.save(dog)

    await useCase.execute(dog.id.value)

    const saved = await fakeRepo.findById(dog.id)
    assert.equal(saved!.state, RobotDogState.IDLE)
  })
})
