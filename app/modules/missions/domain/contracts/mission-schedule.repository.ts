import type MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { type MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'

export abstract class MissionScheduleRepository {
  abstract findById(id: MissionScheduleId): Promise<MissionSchedule | null>
  abstract findByMission(missionId: string): Promise<MissionSchedule[]>
  abstract findEnabled(): Promise<MissionSchedule[]>
  abstract save(schedule: MissionSchedule): Promise<void>
  abstract delete(id: MissionScheduleId): Promise<void>
}
