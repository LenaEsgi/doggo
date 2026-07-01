import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import {
  RobotCommand,
  type RobotCommandPayload,
} from '#app/modules/robot-communication/domain/types/robot-command.type'

@inject()
export class SendRobotCommandUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService
  ) {}

  async execute(dogId: string, payload: RobotCommandPayload): Promise<void> {
    if (payload.type === RobotCommand.START_MISSION && !payload.missionId) {
      throw new InvalidRobotCommandError('missionId is required for START_MISSION command')
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))

    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    switch (payload.type) {
      case RobotCommand.START_MISSION:
        dog.startMission()
        break
      case RobotCommand.STOP_MISSION:
        dog.endMission()
        break
      case RobotCommand.START_SESSION:
        dog.startSession()
        break
      case RobotCommand.END_SESSION:
        dog.endSession()
        break
      case RobotCommand.EMERGENCY_STOP:
        dog.markError()
        break
    }

    await this.communicationService.sendCommand(dogId, payload.type, payload.missionId)
    await this.dogRepository.save(dog)
  }
}
