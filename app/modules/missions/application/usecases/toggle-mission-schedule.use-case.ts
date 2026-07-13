import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { ToggleMissionScheduleDto } from '#app/modules/missions/application/dto/toggle-mission-schedule.dto'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

@inject()
export class ToggleMissionScheduleUseCase {
  constructor(private missionScheduleRepository: MissionScheduleRepository) {}

  async execute(dto: ToggleMissionScheduleDto): Promise<void> {
    logger.info('ToggleMissionScheduleUseCase started', { dto })

    const scheduleId = MissionScheduleId.fromString(dto.id)
    const schedule = await this.missionScheduleRepository.findById(scheduleId)

    if (!schedule) {
      throw new MissionScheduleNotFoundError(dto.id)
    }

    if (dto.enabled) {
      schedule.enable()
    } else {
      schedule.disable()
    }

    await this.missionScheduleRepository.save(schedule)
  }
}
