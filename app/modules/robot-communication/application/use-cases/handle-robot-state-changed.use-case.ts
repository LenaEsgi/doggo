import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

@inject()
export class HandleRobotStateChangedUseCase {
  constructor(private readonly dogRepository: RobotDogRepository) {}

  async execute(dogId: string, rawState: string): Promise<void> {
    const state = rawState as RobotDogState
    if (!Object.values(RobotDogState).includes(state)) {
      logger.warn({ dogId, rawState }, 'HandleRobotStateChanged: unknown state, ignoring')
      return
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      logger.warn({ dogId }, 'HandleRobotStateChanged: unknown robot, ignoring')
      return
    }

    dog.applyStateFromRobot(state)
    await this.dogRepository.save(dog)

    void DogStateChangedEvent.dispatch(dogId, state)
  }
}
