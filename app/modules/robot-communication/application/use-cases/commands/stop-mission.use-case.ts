import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { type RobotDog } from '#dogs/domain/robot-dog.entity'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

@inject()
export class StopMissionCommandUseCase {
  readonly command = RobotCommand.STOP_MISSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService,
    private readonly missionRunRepository: MissionRunRepository
  ) {}

  async execute(dogId: string): Promise<RobotDog> {
    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    const activeRun = await this.missionRunRepository.findActiveRunByRobotDog(dogId)
    if (!activeRun) {
      throw new NoActiveMissionRunError(dogId)
    }

    await this.communicationService.sendCommand(dogId, this.command)

    activeRun.interrupt()
    dog.endMission()

    await this.missionRunRepository.save(activeRun)
    await this.dogRepository.save(dog)
    void DogStateChangedEvent.dispatch(dog.id.toString(), dog.state)

    return dog
  }
}
