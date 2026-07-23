import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import MissionAssignedToDogEvent from '#app/modules/missions/domain/events/mission-assigned-to-dog.event'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'
import { MissionFirmwareCompatibilityService } from '#app/modules/missions/application/services/mission-firmware-compatibility.service'

@inject()
export class AssignMissionToDogUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private dogRepository: RobotDogGateway,
    private compatibilityService: MissionFirmwareCompatibilityService
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

    const incompatibleActions = await this.compatibilityService.findIncompatibleActions(
      mission.getStepsInOrder().map((step) => step.actionId),
      dog.firmwareVersion
    )
    if (incompatibleActions.length > 0) {
      throw new IncompatibleRobotActionsError(dog.firmwareVersion, incompatibleActions)
    }

    mission.assignRobot(RobotDogId.fromString(dogId))

    await this.missionRepository.assignToDog(missionId, dogId)

    logger.info('AssignMissionToDogUseCase completed successfully', { missionId, dogId })
    void MissionAssignedToDogEvent.dispatch(missionId, mission.name, dogId, dog.name)
  }
}
