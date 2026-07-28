import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

@inject()
export class StartSessionCommandUseCase {
  readonly command = RobotCommand.START_SESSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService
  ) {}

  async execute(dogId: string): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    dog.startSession()

    try {
      await this.communicationService.sendCommand(dogId, this.command)
    } catch (error) {
      logger.error(
        { dogId, reason: error instanceof Error ? error.message : String(error) },
        'StartSessionCommandUseCase failed to send start-session command to robot'
      )
      throw error
    }

    await this.dogRepository.save(dog)
    void DogStateChangedEvent.dispatch(dogId, dog.state)
    logger.info({ dogId }, 'StartSessionCommandUseCase session started')
  }
}
