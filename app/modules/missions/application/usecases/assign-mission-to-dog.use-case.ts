import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import MissionAssignedToDogEvent from '#app/modules/missions/domain/events/mission-assigned-to-dog.event'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { compareSemver } from '#app/modules/share/utils/semver'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

@inject()
export class AssignMissionToDogUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private dogRepository: RobotDogGateway,
    private actionRepository: ActionRepository
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

    await this.ensureRobotSupportsAllActions(mission, dog.firmwareVersion)

    mission.assignRobot(RobotDogId.fromString(dogId))

    await this.missionRepository.assignToDog(missionId, dogId)

    logger.info('AssignMissionToDogUseCase completed successfully', { missionId, dogId })
    void MissionAssignedToDogEvent.dispatch(missionId, mission.name, dogId, dog.name)
  }

  private async ensureRobotSupportsAllActions(
    mission: Mission,
    robotFirmwareVersion: string
  ): Promise<void> {
    const actionIds = [...new Set(mission.getStepsInOrder().map((step) => step.actionId))]
    const actions = await Promise.all(
      actionIds.map((id) => this.actionRepository.findById(ActionId.fromString(id)))
    )

    const incompatible = actions
      .filter((action): action is NonNullable<typeof action> => action !== null)
      .filter(
        (action) =>
          action.minFirmwareVersion !== null &&
          compareSemver(robotFirmwareVersion, action.minFirmwareVersion) < 0
      )
      .map((action) => ({
        code: action.code,
        name: action.name,
        minFirmwareVersion: action.minFirmwareVersion as string,
      }))

    if (incompatible.length > 0) {
      throw new IncompatibleRobotActionsError(robotFirmwareVersion, incompatible)
    }
  }
}
