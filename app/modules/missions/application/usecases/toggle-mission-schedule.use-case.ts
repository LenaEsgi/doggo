import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { MissionFirmwareCompatibilityService } from '#app/modules/missions/application/services/mission-firmware-compatibility.service'
import { ToggleMissionScheduleDto } from '#app/modules/missions/application/dto/toggle-mission-schedule.dto'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'
import { findOrThrow } from '#app/modules/share/utils/find-or-throw'

@inject()
export class ToggleMissionScheduleUseCase {
  constructor(
    private missionScheduleRepository: MissionScheduleRepository,
    private missionRepository: MissionRepository,
    private dogGateway: RobotDogGateway,
    private compatibilityService: MissionFirmwareCompatibilityService
  ) {}

  async execute(dto: ToggleMissionScheduleDto): Promise<void> {
    logger.info('ToggleMissionScheduleUseCase started', { dto })

    const scheduleId = MissionScheduleId.fromString(dto.id)
    const schedule = await findOrThrow(
      () => this.missionScheduleRepository.findById(scheduleId),
      MissionScheduleNotFoundError,
      dto.id
    )

    if (schedule.missionId.value !== dto.missionId) {
      throw new MissionScheduleNotFoundError(dto.id)
    }

    if (dto.enabled) {
      const mission = await findOrThrow(
        () => this.missionRepository.findById(schedule.missionId),
        MissionNotFoundError,
        dto.missionId
      )

      const dog = await findOrThrow(
        () => this.dogGateway.findBy(schedule.robotDogId),
        RobotDogNotFoundError,
        schedule.robotDogId.value
      )

      const incompatibleActions = await this.compatibilityService.findIncompatibleActions(
        mission.getStepsInOrder().map((step) => step.actionId),
        dog.firmwareVersion
      )
      if (incompatibleActions.length > 0) {
        throw new IncompatibleRobotActionsError(dog.firmwareVersion, incompatibleActions)
      }

      schedule.enable()
    } else {
      schedule.disable()
    }

    await this.missionScheduleRepository.save(schedule)
  }
}
