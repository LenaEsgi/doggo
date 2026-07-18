import { inject } from '@adonisjs/core'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import type MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'

@inject()
export class ListMissionSchedulesByMissionUseCase {
  constructor(private missionScheduleRepository: MissionScheduleRepository) {}

  async execute(missionId: string): Promise<MissionSchedule[]> {
    return this.missionScheduleRepository.findByMission(missionId)
  }
}
