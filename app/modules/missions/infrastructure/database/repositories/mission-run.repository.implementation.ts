import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { type MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import MissionRunStepModel from '#app/modules/missions/infrastructure/database/models/mission-run-step'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'

const ACTIVE_STATUSES = [MissionRunStatus.PENDING, MissionRunStatus.RUNNING]

export class MissionRunRepositoryImplementation implements MissionRunRepository {
  async findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null> {
    const row = await MissionRunModel.query()
      .where('mission_id', missionId)
      .where('robot_dog_id', robotDogId)
      .whereIn('status', ACTIVE_STATUSES)
      .preload('runSteps')
      .first()

    return row ? this.toDomain(row) : null
  }

  async findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null> {
    const row = await MissionRunModel.query()
      .where('robot_dog_id', robotDogId)
      .whereIn('status', ACTIVE_STATUSES)
      .preload('runSteps')
      .first()

    return row ? this.toDomain(row) : null
  }

  async hasActiveRunForMission(missionId: string): Promise<boolean> {
    const row = await MissionRunModel.query()
      .where('mission_id', missionId)
      .whereIn('status', ACTIVE_STATUSES)
      .first()

    return row !== null
  }

  async save(run: MissionRun): Promise<void> {
    try {
      await db.transaction(async (trx) => {
        await MissionRunModel.updateOrCreate(
          { id: run.id.value },
          {
            missionId: run.missionId.value,
            robotDogId: run.robotDogId.value,
            status: run.status,
            startedAt: DateTime.fromJSDate(run.startedAt),
            endedAt: run.endedAt ? DateTime.fromJSDate(run.endedAt) : null,
          },
          { client: trx }
        )

        const stepsData = run.runSteps.map((step) => ({
          id: step.id.value,
          missionRunId: run.id.value,
          missionStepId: step.stepId.value,
          status: step.status,
          sequenceOrder: step.order,
        }))

        await MissionRunStepModel.updateOrCreateMany('id', stepsData, { client: trx })
      })
    } catch (error) {
      if (this.isUniqueActiveRunViolation(error)) {
        throw new InvalidMissionAlreadyRunningError()
      }
      throw error
    }
  }

  private isUniqueActiveRunViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505' &&
      'constraint' in error &&
      (error as { constraint?: string }).constraint === 'one_active_run_per_dog'
    )
  }

  private toDomain(row: MissionRunModel): MissionRun {
    const runSteps = row.runSteps.map((s) =>
      MissionRunStep.rehydrate(s.id, s.missionStepId, s.status, s.sequenceOrder)
    )

    return MissionRun.rehydrate(
      row.id,
      row.missionId,
      row.robotDogId,
      row.status,
      runSteps,
      row.startedAt.toJSDate(),
      row.endedAt ? row.endedAt.toJSDate() : null
    )
  }
}
