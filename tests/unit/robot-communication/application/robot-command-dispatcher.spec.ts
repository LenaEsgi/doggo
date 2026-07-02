import { test } from '@japa/runner'
import { RobotCommandDispatcher } from '#app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { EmergencyStopCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'

function fakeHandler(command: RobotCommand) {
  const calls: Array<{ dogId: string; missionId?: string }> = []
  return {
    command,
    calls,
    execute: async (dogId: string, missionId?: string) => {
      calls.push({ dogId, missionId })
    },
  }
}

test.group('RobotCommandDispatcher', () => {
  test('route vers le handler correspondant au type de commande', async ({ assert }) => {
    const startMission = fakeHandler(RobotCommand.START_MISSION)
    const stopMission = fakeHandler(RobotCommand.STOP_MISSION)
    const startSession = fakeHandler(RobotCommand.START_SESSION)
    const endSession = fakeHandler(RobotCommand.END_SESSION)
    const emergencyStop = fakeHandler(RobotCommand.EMERGENCY_STOP)

    const dispatcher = new RobotCommandDispatcher(
      startMission as unknown as StartMissionCommandUseCase,
      stopMission as unknown as StopMissionCommandUseCase,
      startSession as unknown as StartSessionCommandUseCase,
      endSession as unknown as EndSessionCommandUseCase,
      emergencyStop as unknown as EmergencyStopCommandUseCase
    )

    await dispatcher.execute('dog-1', { type: RobotCommand.START_SESSION })

    assert.lengthOf(startSession.calls, 1)
    assert.lengthOf(startMission.calls, 0)
    assert.equal(startSession.calls[0].dogId, 'dog-1')
  })

  test('transmet le missionId au handler', async ({ assert }) => {
    const startMission = fakeHandler(RobotCommand.START_MISSION)
    const dispatcher = new RobotCommandDispatcher(
      startMission as unknown as StartMissionCommandUseCase,
      fakeHandler(RobotCommand.STOP_MISSION) as unknown as StopMissionCommandUseCase,
      fakeHandler(RobotCommand.START_SESSION) as unknown as StartSessionCommandUseCase,
      fakeHandler(RobotCommand.END_SESSION) as unknown as EndSessionCommandUseCase,
      fakeHandler(RobotCommand.EMERGENCY_STOP) as unknown as EmergencyStopCommandUseCase
    )

    await dispatcher.execute('dog-1', { type: RobotCommand.START_MISSION, missionId: 'm-1' })

    assert.equal(startMission.calls[0].missionId, 'm-1')
  })
})
