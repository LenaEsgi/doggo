import type MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { type MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { type MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'

export class FakeMissionScheduleRepository implements MissionScheduleRepository {
  public storedSchedules: MissionSchedule[] = []

  async findById(id: MissionScheduleId): Promise<MissionSchedule | null> {
    return this.storedSchedules.find((schedule) => schedule.id.equals(id)) ?? null
  }

  async findByMission(missionId: string): Promise<MissionSchedule[]> {
    return this.storedSchedules.filter((schedule) => schedule.missionId.value === missionId)
  }

  async findEnabled(): Promise<MissionSchedule[]> {
    return this.storedSchedules.filter((schedule) => schedule.enabled)
  }

  async save(schedule: MissionSchedule): Promise<void> {
    const index = this.storedSchedules.findIndex((existing) => existing.id.equals(schedule.id))
    if (index >= 0) {
      this.storedSchedules[index] = schedule
    } else {
      this.storedSchedules.push(schedule)
    }
  }

  async delete(id: MissionScheduleId): Promise<void> {
    this.storedSchedules = this.storedSchedules.filter((schedule) => !schedule.id.equals(id))
  }
}
