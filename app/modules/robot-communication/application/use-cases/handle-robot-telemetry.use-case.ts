import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import RobotTelemetryReceivedEvent from '#dogs/domain/events/robot-telemetry-received.event'
import RobotBatteryLowEvent from '#dogs/domain/events/robot-battery-low.event'
import { type RobotTelemetry } from '#app/modules/robot-communication/domain/types/robot-telemetry.type'

@inject()
export class HandleRobotTelemetryUseCase {
  constructor(private readonly dogRepository: RobotDogRepository) {}

  async execute(dogId: string, telemetry: RobotTelemetry): Promise<void> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))

    if (!dog) {
      logger.warn({ dogId }, 'HandleRobotTelemetry: unknown robot, ignoring')
      return
    }

    const previousBatteryLevel = dog.batteryLevel
    dog.updateBatteryLevel(telemetry.battery)
    dog.updateHeartbeat(new Date())

    await this.dogRepository.save(dog)

    if (dog.hasEnteredLowBatteryZone(previousBatteryLevel)) {
      void RobotBatteryLowEvent.dispatch(dogId, dog.name, dog.batteryLevel)
    }

    void RobotTelemetryReceivedEvent.dispatch(dogId, dog.batteryLevel, dog.state)
  }
}
