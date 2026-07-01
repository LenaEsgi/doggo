import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { SendRobotCommandUseCase } from '#app/modules/robot-communication/application/use-cases/send-robot-command.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'

test.group('SendRobotCommandUseCase — ordering', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let useCase: SendRobotCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    useCase = new SendRobotCommandUseCase(fakeRepo, fakeMqtt)
  })

  test('envoie la commande MQTT avant de persister en base', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const callOrder: string[] = []

    const originalSendCommand = fakeMqtt.sendCommand.bind(fakeMqtt)
    fakeMqtt.sendCommand = async (dogId, command, missionId) => {
      callOrder.push('mqtt')
      return originalSendCommand(dogId, command, missionId)
    }

    const originalSave = fakeRepo.save.bind(fakeRepo)
    fakeRepo.save = async (d) => {
      callOrder.push('save')
      return originalSave(d)
    }

    await useCase.execute(dog.id.value, { type: RobotCommand.START_SESSION })

    assert.deepEqual(callOrder, ['mqtt', 'save'])
  })

  test('ne persiste pas en base si la publication MQTT échoue', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)
    fakeMqtt.shouldFail = true

    let saveCalled = false
    fakeRepo.save = async () => {
      saveCalled = true
    }

    await assert.rejects(() => useCase.execute(dog.id.value, { type: RobotCommand.START_SESSION }))

    assert.isFalse(saveCalled)
  })
})

test.group('SendRobotCommandUseCase — validation', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let useCase: SendRobotCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    useCase = new SendRobotCommandUseCase(fakeRepo, fakeMqtt)
  })

  test('lève InvalidRobotCommandError pour START_MISSION sans missionId', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(
      () => useCase.execute(dog.id.value, { type: RobotCommand.START_MISSION }),
      InvalidRobotCommandError
    )

    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('accepte START_MISSION quand missionId est fourni', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute(dog.id.value, {
      type: RobotCommand.START_MISSION,
      missionId: '550e8400-e29b-41d4-a716-446655440000',
    })

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].missionId, '550e8400-e29b-41d4-a716-446655440000')
  })
})
