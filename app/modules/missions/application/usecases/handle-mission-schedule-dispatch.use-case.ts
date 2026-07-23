import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { MissionScheduleRepository } from '#app/modules/missions/domain/contracts/mission-schedule.repository'
import { MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { type MissionScheduleDispatchPayload } from '#app/modules/missions/domain/contracts/mission-schedule-dispatch-queue'
import { MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'
import MissionScheduleSkippedEvent from '#app/modules/missions/domain/events/mission-schedule-skipped.event'

@inject()
export class HandleMissionScheduleDispatchUseCase {
  constructor(
    private startMissionUseCase: StartMissionCommandUseCase,
    private missionScheduleRepository: MissionScheduleRepository,
    private firingRepository: MissionScheduleFiringRepository,
    private missionRepository: MissionRepository
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
        logger.warn(
          { scheduleId: payload.scheduleId, missionId: payload.missionId, dogId: payload.dogId },
          'HandleMissionScheduleDispatch skipped: robot already running a mission'
        )
        await this.firingRepository.recordOutcome(
          payload.scheduleId,
          firedForMinute,
          MissionScheduleFiringOutcome.ROBOT_BUSY,
          null
        )
        const mission = await this.missionRepository.findById(
          MissionId.fromString(payload.missionId)
        )
        if (mission) {
          void MissionScheduleSkippedEvent.dispatch(
            payload.scheduleId,
            payload.missionId,
            payload.dogId,
            mission.name
          )
        }
        return
      }

      if (error instanceof MissionNotAssignedToRobotError) {
        logger.warn(
          { scheduleId: payload.scheduleId, missionId: payload.missionId, dogId: payload.dogId },
          'HandleMissionScheduleDispatch: mission no longer assigned to robot, disabling schedule'
        )
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

      if (error instanceof IncompatibleRobotActionsError) {
        logger.warn(
          { scheduleId: payload.scheduleId, missionId: payload.missionId, dogId: payload.dogId },
          'HandleMissionScheduleDispatch: robot firmware no longer compatible, disabling schedule'
        )
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

      logger.error(
        {
          scheduleId: payload.scheduleId,
          missionId: payload.missionId,
          dogId: payload.dogId,
          reason: error instanceof Error ? error.message : String(error),
        },
        'HandleMissionScheduleDispatch failed unexpectedly'
      )
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
