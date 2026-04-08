import type Mission from '#app/modules/missions/domain/entities/mission.entity'
import { type MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { type MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'

export class FakeMissionRepository implements MissionRepository {
  public storedMissions: Mission[] = []
  private readonly missionDogs = new Map<string, Set<string>>()

  async findById(id: MissionId): Promise<Mission | null> {
    return this.storedMissions.find((m) => m.id.equals(id)) || null
  }

  async index(options?: PaginationDto) {
    const page = options?.page ?? 1
    const perPage = options?.limit ?? 10

    const total = this.storedMissions.length
    const lastPage = Math.ceil(total / perPage)
    const start = (page - 1) * perPage
    const end = start + perPage
    const paginatedData = this.storedMissions.slice(start, end)

    return {
      data: paginatedData,
      meta: {
        total,
        perPage,
        currentPage: page,
        firstPage: 1,
        lastPage,
      },
    }
  }

  async save(mission: Mission): Promise<void> {
    const index = this.storedMissions.findIndex((m) => m.id.equals(mission.id))
    if (index >= 0) {
      this.storedMissions[index] = mission
    } else {
      this.storedMissions.push(mission)
    }
  }

  async delete(id: MissionId): Promise<void> {
    this.storedMissions = this.storedMissions.filter((m) => !m.id.equals(id))
    this.missionDogs.delete(id.value)
  }

  async listByRobotDog(dogId: string, options?: PaginationDto) {
    const page = options?.page ?? 1
    const perPage = options?.limit ?? 10

    const filtered = this.storedMissions.filter((mission) => {
      return this.missionDogs.get(mission.id.value)?.has(dogId) ?? false
    })

    const total = filtered.length
    const lastPage = Math.ceil(total / perPage)
    const start = (page - 1) * perPage
    const end = start + perPage

    return {
      data: filtered.slice(start, end),
      meta: {
        total,
        perPage,
        currentPage: page,
        firstPage: 1,
        lastPage,
      },
    }
  }

  async assignToDog(missionId: string, dogId: string): Promise<void> {
    const linkedDogs = this.missionDogs.get(missionId) ?? new Set<string>()
    linkedDogs.add(dogId)
    this.missionDogs.set(missionId, linkedDogs)
  }

  async removeFromDog(missionId: string, dogId: string): Promise<void> {
    const linkedDogs = this.missionDogs.get(missionId)
    if (!linkedDogs) {
      return
    }

    linkedDogs.delete(dogId)
    if (linkedDogs.size === 0) {
      this.missionDogs.delete(missionId)
      return
    }

    this.missionDogs.set(missionId, linkedDogs)
  }
}
