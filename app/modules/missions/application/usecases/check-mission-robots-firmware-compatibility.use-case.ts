import { inject } from '@adonisjs/core'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import {
  MissionFirmwareCompatibilityService,
  type IncompatibleAction,
} from '#app/modules/missions/application/services/mission-firmware-compatibility.service'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'

export interface FirmwareWarning {
  robotDogId: string
  robotDogName: string
  robotFirmwareVersion: string
  incompatibleActions: IncompatibleAction[]
  schedulesDisabled: number
}

@inject()
export class CheckMissionRobotsFirmwareCompatibilityUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private missionScheduleRepository: MissionScheduleRepository,
    private dogGateway: RobotDogGateway,
    private compatibilityService: MissionFirmwareCompatibilityService
  ) {}

  async execute(missionId: string): Promise<FirmwareWarning[]> {
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) {
      throw new MissionNotFoundError(missionId)
    }

    const actionIds = mission.getStepsInOrder().map((step) => step.actionId)
    const warnings: FirmwareWarning[] = []

    for (const robotDogId of mission.robotDogIds) {
      const dog = await this.dogGateway.findBy(robotDogId)
      if (!dog) continue

      const incompatibleActions = await this.compatibilityService.findIncompatibleActions(
        actionIds,
        dog.firmwareVersion
      )
      if (incompatibleActions.length === 0) continue

      const schedules = await this.missionScheduleRepository.findByMission(missionId)
      const schedulesToDisable = schedules.filter(
        (schedule) => schedule.robotDogId.equals(robotDogId) && schedule.enabled
      )
      for (const schedule of schedulesToDisable) {
        schedule.disable()
        await this.missionScheduleRepository.save(schedule)
      }

      warnings.push({
        robotDogId: robotDogId.value,
        robotDogName: dog.name,
        robotFirmwareVersion: dog.firmwareVersion,
        incompatibleActions,
        schedulesDisabled: schedulesToDisable.length,
      })
    }

    return warnings
  }
}
