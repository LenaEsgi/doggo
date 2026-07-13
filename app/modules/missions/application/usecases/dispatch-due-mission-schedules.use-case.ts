import { inject } from '@adonisjs/core'
import { type DateTime } from 'luxon'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { MissionScheduleDispatchQueue } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { MISSION_SCHEDULE_TIMEZONE } from '#app/modules/missions/domain/mission-schedule-timezone'

@inject()
export class DispatchDueMissionSchedulesUseCase {
  constructor(
    private missionScheduleRepository: MissionScheduleRepository,
    private firingRepository: MissionScheduleFiringRepository,
    private dispatchQueue: MissionScheduleDispatchQueue
  ) {}

  async execute(now: DateTime): Promise<void> {
    const nowLocal = now.setZone(MISSION_SCHEDULE_TIMEZONE)
    const firedForMinute = now.toUTC().set({ second: 0, millisecond: 0 })

    const schedules = await this.missionScheduleRepository.findEnabled()
    const due = schedules.filter((schedule) => schedule.isDueAt(nowLocal))

    for (const schedule of due) {
      const claimed = await this.firingRepository.tryClaim(schedule.id.value, firedForMinute)
      if (!claimed) {
        continue
      }

      await this.dispatchQueue.enqueue({
        scheduleId: schedule.id.value,
        missionId: schedule.missionId.value,
        dogId: schedule.robotDogId.value,
        firedForMinute: firedForMinute.toISO()!,
      })
    }
  }
}
