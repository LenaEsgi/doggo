import { type RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { type RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { DateTime } from 'luxon'
import { type RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { type FindAllOptions } from '#dogs/domain/contracts/find-all-options'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import type { Tx } from '#app/modules/share/domain/contracts/unit-of-work'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

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

  async findByIds(ids: string[]): Promise<RobotDog[]> {
    if (ids.length === 0) {
      return []
    }

    const rows = await RobotDogModel.query().whereIn('id', ids)

    return rows.map((row) =>
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
  }

  async findAll({ page = 1, limit = 20, search }: FindAllOptions = {}): Promise<
    PaginatedResult<RobotDog>
  > {
    const query = RobotDogModel.query()

    if (search) {
      const term = `%${search}%`
      query.where((q) => {
        q.whereILike('name', term).orWhereILike('serial_number', term)
      })
    }

    const paginated = await query.paginate(page, limit)

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

  async save(dog: RobotDog, tx?: Tx): Promise<void> {
    await RobotDogModel.updateOrCreate(
      { id: dog.id.value },
      {
        serialNumber: dog.serialNumber,
        key: dog.key.value,
        name: dog.name,
        state: dog.state,
        batteryLevel: dog.batteryLevel,
        lastHeartbeat: DateTime.fromJSDate(dog.lastHeartbeat),
      },
      tx ? { client: tx as unknown as TransactionClientContract } : undefined
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
