import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { MissionFirmwareCompatibilityService } from '#app/modules/missions/application/services/mission-firmware-compatibility.service'
import { CreateMissionScheduleDto } from '#app/modules/missions/application/dto/create-mission-schedule.dto'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'

@inject()
export class CreateMissionScheduleUseCase {
  constructor(
    private missionScheduleRepository: MissionScheduleRepository,
    private missionRepository: MissionRepository,
    private dogGateway: RobotDogGateway,
    private compatibilityService: MissionFirmwareCompatibilityService
  ) {}

  async execute(dto: CreateMissionScheduleDto): Promise<{ id: string }> {
    logger.info('CreateMissionScheduleUseCase started', { dto })

    const isAssigned = await this.missionRepository.isAssignedToDog(dto.missionId, dto.robotDogId)
    if (!isAssigned) {
      throw new MissionNotAssignedToRobotError(dto.missionId, dto.robotDogId)
    }

    const mission = await this.missionRepository.findById(MissionId.fromString(dto.missionId))
    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    const dog = await this.dogGateway.findBy(RobotDogId.fromString(dto.robotDogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dto.robotDogId)
    }

    const incompatibleActions = await this.compatibilityService.findIncompatibleActions(
      mission.getStepsInOrder().map((step) => step.actionId),
      dog.firmwareVersion
    )
    if (incompatibleActions.length > 0) {
      throw new IncompatibleRobotActionsError(dog.firmwareVersion, incompatibleActions)
    }

    const schedule = MissionSchedule.create(
      MissionId.fromString(dto.missionId),
      RobotDogId.fromString(dto.robotDogId),
      dto.daysOfWeek,
      dto.hour,
      dto.minute
    )

    await this.missionScheduleRepository.save(schedule)

    return { id: schedule.id.value }
  }
}
