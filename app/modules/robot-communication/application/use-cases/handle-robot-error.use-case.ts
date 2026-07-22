import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDiagnosticEventRepository } from '#app/modules/robot-communication/domain/contracts/robot-diagnostic-event.repository'
import { RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { type RobotErrorEvent } from '#app/modules/robot-communication/domain/types/robot-error-event.type'

@inject()
export class HandleRobotErrorUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly diagnosticRepository: RobotDiagnosticEventRepository
  ) {}

  async execute(dogId: string, payload: RobotErrorEvent): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))

    if (!dog) {
      logger.warn({ dogId }, 'HandleRobotError: unknown robot, ignoring')
      return
    }

    logger.error({ dogId, payload }, 'HandleRobotError: robot reported an error')
    await this.diagnosticRepository.save(RobotDiagnosticEvent.fromError(dogId, payload))
  }
}
