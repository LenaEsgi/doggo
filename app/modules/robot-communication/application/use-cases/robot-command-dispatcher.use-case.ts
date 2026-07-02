import { inject } from '@adonisjs/core'
import {
  RobotCommand,
  type RobotCommandPayload,
} from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import { StartSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-session.use-case'
import { EndSessionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/end-session.use-case'
import { EmergencyStopCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/emergency-stop.use-case'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'

@inject()
export class RobotCommandDispatcher {
  private readonly handlers: Map<RobotCommand, RobotCommandHandler>

  constructor(
    startMission: StartMissionCommandUseCase,
    stopMission: StopMissionCommandUseCase,
    startSession: StartSessionCommandUseCase,
    endSession: EndSessionCommandUseCase,
    emergencyStop: EmergencyStopCommandUseCase
  ) {
    this.handlers = new Map<RobotCommand, RobotCommandHandler>([
      [startMission.command, startMission],
      [stopMission.command, stopMission],
      [startSession.command, startSession],
      [endSession.command, endSession],
      [emergencyStop.command, emergencyStop],
    ])
  }

  async execute(dogId: string, payload: RobotCommandPayload): Promise<void> {
    const handler = this.handlers.get(payload.type)
    if (!handler) {
      throw new InvalidRobotCommandError(`Unsupported robot command: ${payload.type}`)
    }
    await handler.execute(dogId, payload.missionId)
  }
}
