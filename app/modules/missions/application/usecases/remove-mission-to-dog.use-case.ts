import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import MissionRemovedFromDogEvent from '#app/modules/missions/domain/events/mission-removed-from-dog.event'

@inject()
export class RemoveMissionToDogUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private dogRepository: RobotDogGateway,
    private missionRunRepository: MissionRunRepository
  ) {}

  async execute(missionId: string, dogId: string): Promise<void> {
    const dog = await this.dogRepository.findBy(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(`Robot Dog with id ${dogId} not found`)
    }
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))

    if (!mission) {
      throw new MissionNotFoundError(missionId)
    }

    mission.unassignRobot(RobotDogId.fromString(dogId))

    const activeRun = await this.missionRunRepository.findActiveRun(missionId, dogId)
    if (activeRun) {
      throw new InvalidMissionAlreadyRunningError()
    }

    await this.missionRepository.removeFromDog(missionId, dogId)

    logger.info('RemoveMissionToDogUseCase completed successfully', { missionId, dogId })
    void MissionRemovedFromDogEvent.dispatch(missionId, mission.name, dogId, dog.name)
  }
}
