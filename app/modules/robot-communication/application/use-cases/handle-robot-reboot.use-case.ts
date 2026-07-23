import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { isValidSemver } from '#app/modules/share/utils/semver'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDiagnosticEventRepository } from '#app/modules/robot-communication/domain/contracts/robot-diagnostic-event.repository'
import { RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { type RobotRebootEvent } from '#app/modules/robot-communication/domain/types/robot-reboot-event.type'

@inject()
export class HandleRobotRebootUseCase {
  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly diagnosticRepository: RobotDiagnosticEventRepository
  ) {}

  async execute(dogId: string, payload: RobotRebootEvent): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))

    if (!dog) {
      logger.warn({ dogId }, 'HandleRobotReboot: unknown robot, ignoring')
      return
    }

    logger.warn({ dogId, payload }, 'HandleRobotReboot: robot rebooted')
    await this.diagnosticRepository.save(RobotDiagnosticEvent.fromReboot(dogId, payload))

    if (isValidSemver(payload.firmwareVersion)) {
      dog.updateFirmwareVersion(payload.firmwareVersion)
      await this.dogRepository.save(dog)
    } else {
      logger.warn(
        { dogId, firmwareVersion: payload.firmwareVersion },
        'HandleRobotReboot: malformed firmwareVersion, keeping previous value'
      )
    }
  }
}
