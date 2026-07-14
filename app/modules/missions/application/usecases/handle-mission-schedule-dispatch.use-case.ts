import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { type MissionScheduleDispatchPayload } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import MissionScheduleSkippedEvent from '#app/modules/missions/domain/events/mission-schedule-skipped.event'

@inject()
export class HandleMissionScheduleDispatchUseCase {
  constructor(
    private startMissionUseCase: StartMissionCommandUseCase,
    private missionScheduleRepository: MissionScheduleRepository,
    private firingRepository: MissionScheduleFiringRepository
  ) {}

  async execute(payload: MissionScheduleDispatchPayload): Promise<void> {
    const firedForMinute = DateTime.fromISO(payload.firedForMinute, { zone: 'utc' })

    try {
      const run = await this.startMissionUseCase.execute(payload.dogId, payload.missionId)
      await this.firingRepository.recordOutcome(
        payload.scheduleId,
        firedForMinute,
        MissionScheduleFiringOutcome.DISPATCHED,
        run.id.value
      )
      return
    } catch (error) {
      if (error instanceof InvalidMissionAlreadyRunningError) {
        await this.firingRepository.recordOutcome(
          payload.scheduleId,
          firedForMinute,
          MissionScheduleFiringOutcome.ROBOT_BUSY,
          null
        )
        void MissionScheduleSkippedEvent.dispatch(
          payload.scheduleId,
          payload.missionId,
          payload.dogId
        )
        return
      }

      if (error instanceof MissionNotAssignedToRobotError) {
        await this.firingRepository.recordOutcome(
          payload.scheduleId,
          firedForMinute,
          MissionScheduleFiringOutcome.ERROR,
          null
        )
        const schedule = await this.missionScheduleRepository.findById(
          MissionScheduleId.fromString(payload.scheduleId)
        )
        if (schedule) {
          schedule.disable()
          await this.missionScheduleRepository.save(schedule)
        }
        return
      }

      await this.firingRepository.recordOutcome(
        payload.scheduleId,
        firedForMinute,
        MissionScheduleFiringOutcome.ERROR,
        null
      )
      throw error
    }
  }
}
