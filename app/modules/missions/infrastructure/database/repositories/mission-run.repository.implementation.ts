import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import MissionRunStepModel from '#app/modules/missions/infrastructure/database/models/mission-run-step'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

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
      }))

      await MissionRunStepModel.updateOrCreateMany('id', stepsData, { client: trx })
    })
  }

  private toDomain(row: MissionRunModel): MissionRun {
    const runSteps = row.runSteps.map((s) =>
      MissionRunStep.rehydrate(s.id, s.missionStepId, s.status)
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
