import { test } from '@japa/runner'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { SendDriveCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/send-drive-command.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

test.group('SendDriveCommandUseCase', (group) => {
  let fakeMqtt: FakeRobotCommunicationService
  let useCase: SendDriveCommandUseCase

  group.each.setup(() => {
    fakeMqtt = new FakeRobotCommunicationService()
    useCase = new SendDriveCommandUseCase(fakeMqtt)
  })

  test('publie une commande DRIVE avec le throttle et le steering fournis', async ({ assert }) => {
    await useCase.execute('dog-1', 'forward', 'left')

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].dogId, 'dog-1')
    assert.equal(fakeMqtt.calls[0].command, RobotCommand.DRIVE)
    assert.equal(fakeMqtt.calls[0].throttle, 'forward')
    assert.equal(fakeMqtt.calls[0].steering, 'left')
  })

  test('propage une erreur si la publication MQTT échoue', async ({ assert }) => {
    fakeMqtt.shouldFail = true

    await assert.rejects(() => useCase.execute('dog-1', 'none', 'none'))
  })
})
