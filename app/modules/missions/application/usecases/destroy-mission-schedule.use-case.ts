import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { DestroyMissionScheduleDto } from '#app/modules/missions/application/dto/destroy-mission-schedule.dto'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'

@inject()
export class DestroyMissionScheduleUseCase {
  constructor(private missionScheduleRepository: MissionScheduleRepository) {}

  async execute(dto: DestroyMissionScheduleDto): Promise<void> {
    logger.info('DestroyMissionScheduleUseCase started', { dto })

    const scheduleId = MissionScheduleId.fromString(dto.id)
    const schedule = await this.missionScheduleRepository.findById(scheduleId)

    if (!schedule) {
      throw new MissionScheduleNotFoundError(dto.id)
    }

    if (schedule.missionId.value !== dto.missionId) {
      throw new MissionScheduleNotFoundError(dto.id)
    }

    await this.missionScheduleRepository.delete(schedule.id)
  }
}
