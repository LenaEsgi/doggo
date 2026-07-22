import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDiagnosticEventRepository } from '#app/modules/robot-communication/domain/contracts/robot-diagnostic-event.repository'
import { RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { type RobotConnectivityEvent } from '#app/modules/robot-communication/domain/types/robot-connectivity-event.type'

@inject()
export class HandleRobotConnectivityUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly diagnosticRepository: RobotDiagnosticEventRepository
  ) {}

  async execute(dogId: string, payload: RobotConnectivityEvent): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))

    if (!dog) {
      logger.warn({ dogId }, 'HandleRobotConnectivity: unknown robot, ignoring')
      return
    }

    await this.diagnosticRepository.save(RobotDiagnosticEvent.fromConnectivity(dogId, payload))
  }
}
