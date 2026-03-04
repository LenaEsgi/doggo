import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'

export class MissionRepositoryImplementation implements MissionRepository {

  async findById(id: MissionId): Promise<Mission | null> {
    const row = await MissionModel.find(id.value)

    if (!row) return null

    return Mission.rehydrate(row.id, row.name, row.userId, row.status)
  }

  async index(options?: PaginationDto): Promise<PaginatedResult<Mission>> {
    const page = options?.page ?? 1
    const perPage = options?.limit ?? 10

    const paginator = await MissionModel
      .query()
      .orderBy('created_at', 'desc')
      .paginate(page, perPage)

    const missions = paginator.all().map((row) => {
      return Mission.rehydrate(
        row.id,
        row.name,
        row.userId,
        row.status,
        []
      )
    })

    return {
      data: missions,
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        firstPage: paginator.firstPage,
        lastPage: paginator.lastPage,
      }
    }
  }

  async save(mission: Mission): Promise<void> {

    await MissionModel.create({
      id: mission.id.value,
      name: mission.name,
      userId: mission.userId,
      status: mission.status
    })
  }

  delete(): Promise<void> {
    return Promise.resolve(undefined)
  }
}
