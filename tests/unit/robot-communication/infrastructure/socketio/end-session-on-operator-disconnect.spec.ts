import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { endSessionOnOperatorDisconnect } from '#app/modules/robot-communication/infrastructure/socketio/end-session-on-operator-disconnect'

test.group('endSessionOnOperatorDisconnect', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let endSession: EndSessionCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    endSession = new EndSessionCommandUseCase(fakeRepo, fakeMqtt)
  })

  test('termine la session quand la room opérateur est vide', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startSession()
    await fakeRepo.save(dog)

    await endSessionOnOperatorDisconnect(dog.id.value, true, endSession)

    const saved = await fakeRepo.findById(dog.id)
    assert.equal(saved!.state, RobotDogState.IDLE)
    assert.deepEqual(
      fakeMqtt.calls.map((c) => c.command),
      [RobotCommand.END_SESSION]
    )
  })

  test('ne fait rien si un autre opérateur est encore connecté', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.startSession()
    await fakeRepo.save(dog)

    await endSessionOnOperatorDisconnect(dog.id.value, false, endSession)

    const saved = await fakeRepo.findById(dog.id)
    assert.equal(saved!.state, RobotDogState.IN_SESSION)
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('ignore silencieusement si aucune session n’était active', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.doesNotReject(() => endSessionOnOperatorDisconnect(dog.id.value, true, endSession))

    const saved = await fakeRepo.findById(dog.id)
    assert.equal(saved!.state, RobotDogState.IDLE)
    assert.lengthOf(fakeMqtt.calls, 0)
  })
})
