import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotCommandHandler } from '#app/modules/robot-communication/application/contracts/robot-command-handler'

@inject()
export class EmergencyStopCommandUseCase implements RobotCommandHandler {
  readonly command = RobotCommand.EMERGENCY_STOP

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService
  ) {}

  async execute(dogId: string): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    dog.markError()

    await this.communicationService.sendCommand(dogId, this.command)

    await this.dogRepository.save(dog)
  }
}
