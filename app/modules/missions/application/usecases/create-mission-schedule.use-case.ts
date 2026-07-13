import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { CreateMissionScheduleDto } from '#app/modules/missions/application/dto/create-mission-schedule.dto'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'

@inject()
export class CreateMissionScheduleUseCase {
  constructor(
    private missionScheduleRepository: MissionScheduleRepository,
    private missionRepository: MissionRepository
  ) {}

  async execute(dto: CreateMissionScheduleDto): Promise<{ id: string }> {
    logger.info('CreateMissionScheduleUseCase started', { dto })

    const isAssigned = await this.missionRepository.isAssignedToDog(dto.missionId, dto.robotDogId)
    if (!isAssigned) {
      throw new MissionNotAssignedToRobotError(dto.missionId, dto.robotDogId)
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
