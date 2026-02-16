import { RobotDogRepository } from '../../../domain/contracts/robot_dog.repository.js'
import { RobotDog } from '../../../domain/robot_dog.entity.js'
import RobotDogModel from '../models/robot_dog.js'
import { RobotDogState } from '../../../domain/enums/robot_dog.state.js'
import { DateTime } from 'luxon'

export class RobotDogRepositoryImplementation implements RobotDogRepository {
  async findById(id: string): Promise<RobotDog | null> {
    const row = await RobotDogModel.find(id)

    if (!row) return null

    return RobotDog.rehydrate(
      row.id,
      row.serialNumber,
      row.state as RobotDogState,
      row.batteryLevel,
      row.lastHeartbeat?.toJSDate() ? row.lastHeartbeat?.toJSDate() : DateTime.now().toJSDate()
    )
  }
  async findAll(): Promise<RobotDog[]> {
    const rows = await RobotDogModel.all()

    return rows.map((row) =>
      RobotDog.rehydrate(
        row.id,
        row.serialNumber,
        row.state as RobotDogState,
        row.batteryLevel,
        row.lastHeartbeat?.toJSDate() ? row.lastHeartbeat?.toJSDate() : DateTime.now().toJSDate()
      )
    )
  }
  async save(dog: RobotDog): Promise<void> {
    await RobotDogModel.updateOrCreate(
      { id: dog.id },
      {
        serialNumber: dog.serialNumber,
        state: dog.state,
        batteryLevel: dog.batteryLevel,
        lastHeartbeat: DateTime.fromJSDate(dog.lastHeartbeat),
      }
    )
  }

  async delete(id: string): Promise<void> {
    const row = await RobotDogModel.findOrFail(id)
    await row.delete()
  }
}
