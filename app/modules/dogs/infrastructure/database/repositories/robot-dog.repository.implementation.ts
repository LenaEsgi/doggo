import { type RobotDogRepository } from '../../../domain/contracts/robot-dog.repository.js'
import { RobotDog } from '../../../domain/robot-dog.entity.js'
import RobotDogModel from '../models/robot-dog.js'
import { type RobotDogState } from '../../../domain/enums/robot-dog.state.js'
import { DateTime } from 'luxon'
import { type RobotDogId } from '../../../domain/value-objects/robot-dog-id.js'
import { type FindAllOptions } from '#dogs/domain/contracts/find-all-options'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export class RobotDogRepositoryImplementation implements RobotDogRepository {
  async findById(id: RobotDogId): Promise<RobotDog | null> {
    const row = await RobotDogModel.find(id.value)

    if (!row) return null

    return RobotDog.rehydrate(
      row.id,
      row.serialNumber,
      row.key,
      row.name,
      row.state as RobotDogState,
      row.batteryLevel,
      row.lastHeartbeat?.toJSDate() ? row.lastHeartbeat?.toJSDate() : DateTime.now().toJSDate()
    )
  }
  async findAll({ page = 1, limit = 20 }: FindAllOptions = {}): Promise<PaginatedResult<RobotDog>> {
    const paginated = await RobotDogModel.query().paginate(page, limit)

    const data = paginated
      .all()
      .map((row) =>
        RobotDog.rehydrate(
          row.id,
          row.serialNumber,
          row.key,
          row.name,
          row.state as RobotDogState,
          row.batteryLevel,
          row.lastHeartbeat?.toJSDate() ?? DateTime.now().toJSDate()
        )
      )

    return {
      data,
      meta: {
        total: paginated.total,
        perPage: paginated.perPage,
        currentPage: paginated.currentPage,
        firstPage: paginated.firstPage,
        lastPage: paginated.lastPage,
      },
    }
  }

  async save(dog: RobotDog): Promise<void> {
    await RobotDogModel.updateOrCreate(
      { id: dog.id.value },
      {
        serialNumber: dog.serialNumber,
        key: dog.key.value,
        name: dog.name,
        state: dog.state,
        batteryLevel: dog.batteryLevel,
        lastHeartbeat: DateTime.fromJSDate(dog.lastHeartbeat),
      }
    )
  }

  async delete(id: RobotDogId): Promise<void> {
    const row = await RobotDogModel.findOrFail(id.value)
    await row.delete()
  }

  async findBySerialNumber(serialNumber: string): Promise<RobotDog | null> {
    const row = await RobotDogModel.query().where('serialNumber', serialNumber).first()

    if (!row) return null

    return RobotDog.rehydrate(
      row.id,
      row.serialNumber,
      row.key,
      row.name,
      row.state as RobotDogState,
      row.batteryLevel,
      row.lastHeartbeat?.toJSDate() ?? DateTime.now().toJSDate()
    )
  }
}
