import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { UpdateMissionScheduleDto } from '#app/modules/missions/application/dto/update-mission-schedule.dto'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

@inject()
export class UpdateMissionScheduleUseCase {
  constructor(private missionScheduleRepository: MissionScheduleRepository) {}

  async execute(dto: UpdateMissionScheduleDto): Promise<void> {
    logger.info('UpdateMissionScheduleUseCase started', { dto })

    const scheduleId = MissionScheduleId.fromString(dto.id)
    const schedule = await this.missionScheduleRepository.findById(scheduleId)

    if (!schedule) {
      throw new MissionScheduleNotFoundError(dto.id)
    }

    schedule.update(dto.daysOfWeek, dto.hour, dto.minute)

    await this.missionScheduleRepository.save(schedule)
  }
}
