import { type MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import { type MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'
import db from '@adonisjs/lucid/services/db'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

export class MissionRepositoryImplementation implements MissionRepository {
  async findById(id: MissionId): Promise<Mission | null> {
    const row = await MissionModel.query()
      .where('id', id.value)
      .preload('steps', (query) => {
        query.orderBy('sequence_order', 'asc')
      })
      .preload('robotDogs')
      .first()

    if (!row) return null

    const steps = row.steps.map((s) =>
      MissionStep.rehydrate(s.id, s.actionId, s.sequenceOrder, s.parameters)
    )
    const robotDogIds = row.robotDogs.map((dog) => RobotDogId.fromString(dog.id))

    return Mission.rehydrate(row.id, row.name, row.userId, steps, robotDogIds)
  }

  async findAll(options?: PaginationDto): Promise<PaginatedResult<Mission>> {
    const page = Math.max(1, options?.page ?? 1)
    const limit = Math.min(options?.limit ?? 20, 100)

    const paginator = await MissionModel.query()
      .preload('steps', (q) => q.orderBy('sequence_order', 'asc'))
      .orderBy('created_at', 'desc')
      .paginate(page, limit)

    const missions = paginator.all().map((row) =>
      Mission.rehydrate(
        row.id,
        row.name,
        row.userId,
        row.steps.map((s) => MissionStep.rehydrate(s.id, s.actionId, s.sequenceOrder, s.parameters))
      )
    )

    return {
      data: missions,
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        firstPage: paginator.firstPage,
        lastPage: paginator.lastPage,
      },
    }
  }

  async findByUser(userId: string, options?: PaginationDto): Promise<PaginatedResult<Mission>> {
    const page = Math.max(1, options?.page ?? 1)
    const limit = Math.min(options?.limit ?? 20, 100)

    const paginator = await MissionModel.query()
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .paginate(page, limit)

    const missions = paginator
      .all()
      .map((row) => Mission.rehydrate(row.id, row.name, row.userId, []))

    return {
      data: missions,
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        firstPage: paginator.firstPage,
        lastPage: paginator.lastPage,
      },
    }
  }

  async isOwner(userId: string, missionId: string): Promise<boolean> {
    const row = await MissionModel.query()
      .where('id', missionId)
      .where('user_id', userId)
      .first()
    return row !== null
  }

  async save(mission: Mission): Promise<void> {
    await db.transaction(async (trx) => {
      const missionRow = await MissionModel.updateOrCreate(
        { id: mission.id.value },
        {
          name: mission.name,
          userId: mission.userId,
        },
        { client: trx }
      )

      const domainStepIds = mission.missionSteps.map((s) => s.id.value)

      await missionRow
        .useTransaction(trx)
        .related('steps')
        .query()
        .whereNotIn('id', domainStepIds)
        .delete()

      const stepsData = mission.missionSteps.map((step) => ({
        id: step.id.value,
        actionId: step.actionId,
        sequenceOrder: step.order,
        parameters: JSON.stringify(step.parameters),
        missionId: mission.id.value,
      }))
      await MissionStepModel.updateOrCreateMany('id', stepsData, { client: trx })
    })
  }
  async delete(missionId: MissionId): Promise<void> {
    const row = await MissionModel.findOrFail(missionId.value)
    await row.delete()
  }

  async listByRobotDog(dogId: string, options?: PaginationDto): Promise<PaginatedResult<Mission>> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10

    const paginator = await MissionModel.query()
      .whereHas('robotDogs', (q) => {
        q.where('robot_dog_id', dogId)
      })
      .paginate(page, limit)

    const missions = paginator.all().map((row) => {
      return Mission.rehydrate(row.id, row.name, row.userId, [])
    })

    return {
      data: missions,
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        firstPage: paginator.firstPage,
        lastPage: paginator.lastPage,
      },
    }
  }

  async assignToDog(missionId: string, dogId: string): Promise<void> {
    const mission = await MissionModel.findOrFail(missionId)
    await mission.related('robotDogs').attach([dogId])
  }

  async removeFromDog(missionId: string, dogId: string): Promise<void> {
    const mission = await MissionModel.findOrFail(missionId)
    await mission.related('robotDogs').detach([dogId])
  }

  async isAssignedToDog(missionId: string, robotDogId: string): Promise<boolean> {
    const row = await MissionModel.query()
      .where('id', missionId)
      .whereHas('robotDogs', (q) => q.where('robot_dog_id', robotDogId))
      .first()

    return row !== null
  }
}
