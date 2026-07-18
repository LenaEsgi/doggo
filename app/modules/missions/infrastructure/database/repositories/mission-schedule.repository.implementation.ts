import { type MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import MissionScheduleModel from '#app/modules/missions/infrastructure/database/models/mission-schedule'
import { type MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'

export class MissionScheduleRepositoryImplementation implements MissionScheduleRepository {
  private toDomain(row: MissionScheduleModel): MissionSchedule {
    return MissionSchedule.rehydrate(
      row.id,
      row.missionId,
      row.robotDogId,
      row.daysOfWeek,
      row.hour,
      row.minute,
      row.enabled
    )
  }

  async findById(id: MissionScheduleId): Promise<MissionSchedule | null> {
    const row = await MissionScheduleModel.find(id.value)
    return row ? this.toDomain(row) : null
  }

  async findByMission(missionId: string): Promise<MissionSchedule[]> {
    const rows = await MissionScheduleModel.query()
      .where('mission_id', missionId)
      .orderBy('created_at', 'asc')

    return rows.map((row) => this.toDomain(row))
  }

  async findEnabled(): Promise<MissionSchedule[]> {
    const rows = await MissionScheduleModel.query().where('enabled', true)
    return rows.map((row) => this.toDomain(row))
  }

  async save(schedule: MissionSchedule): Promise<void> {
    await MissionScheduleModel.updateOrCreate(
      { id: schedule.id.value },
      {
        missionId: schedule.missionId.value,
        robotDogId: schedule.robotDogId.value,
        daysOfWeek: schedule.daysOfWeek,
        hour: schedule.hour,
        minute: schedule.minute,
        enabled: schedule.enabled,
      }
    )
  }

  async delete(id: MissionScheduleId): Promise<void> {
    const row = await MissionScheduleModel.find(id.value)
    if (row) {
      await row.delete()
    }
  }
}
